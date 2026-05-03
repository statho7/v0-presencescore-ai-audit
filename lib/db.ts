import { neon } from "@neondatabase/serverless"
import type { AuditResult } from "@/lib/audit-data"
import { nameMatches, normalizeName, normalizePostcode } from "@/lib/normalize"
import { findMatchingAudit } from "@/lib/dedupe-agent"

if (!process.env.DATABASE_URL) {
  // We don't throw at import time so that build-time pre-rendering doesn't blow
  // up if the env var hasn't been wired in yet — the runtime calls below will
  // surface a clearer error if it's missing.
  console.warn("[db] DATABASE_URL is not set")
}

export const sql = neon(process.env.DATABASE_URL!)

let schemaReady: Promise<void> | null = null

/**
 * Ensures the `audits` table exists. Idempotent and memoised per process so
 * subsequent calls within the same lambda are essentially free.
 */
export function ensureAuditsTable(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS audits (
          run_id TEXT PRIMARY KEY,
          restaurant_name TEXT NOT NULL,
          postcode TEXT NOT NULL,
          result JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
      // Add normalized columns for de-duplication on rerun. Idempotent.
      await sql`ALTER TABLE audits ADD COLUMN IF NOT EXISTS postcode_normalized TEXT`
      await sql`ALTER TABLE audits ADD COLUMN IF NOT EXISTS name_normalized TEXT`
      await sql`CREATE INDEX IF NOT EXISTS audits_postcode_normalized_idx ON audits (postcode_normalized)`
      await sql`CREATE INDEX IF NOT EXISTS audits_name_normalized_idx ON audits (name_normalized)`
    })().catch((err) => {
      // Reset so the next call can retry rather than caching the failure.
      schemaReady = null
      throw err
    })
  }
  return schemaReady
}

export type AuditRow = {
  run_id: string
  restaurant_name: string
  postcode: string
  result: AuditResult
  created_at: string
}

export async function getAuditByRunId(runId: string): Promise<AuditRow | null> {
  await ensureAuditsTable()
  const rows = (await sql`
    SELECT run_id, restaurant_name, postcode, result, created_at
    FROM audits
    WHERE run_id = ${runId}
    LIMIT 1
  `) as AuditRow[]
  return rows[0] ?? null
}

export async function auditExists(runId: string): Promise<boolean> {
  await ensureAuditsTable()
  const rows = (await sql`SELECT 1 FROM audits WHERE run_id = ${runId} LIMIT 1`) as Array<{ "?column?": number }>
  return rows.length > 0
}

/**
 * Returns the most recent audit (within `withinDays`) that refers to the same
 * restaurant as the user's input. Uses a two-stage match:
 *   1. Deterministic fast-path — exact normalized postcode match + fuzzy
 *      normalized-name substring match. Free, sub-millisecond, catches the
 *      common case ("BRAT" / "E1 6JL" → "BRAT Restaurant" / full address).
 *   2. AI fallback — if the fast-path misses but recent rows exist, ask an
 *      LLM whether the user's input refers to any of them. Catches edge cases
 *      the deterministic check can't (e.g. abbreviations, near-postcode
 *      matches, alternate spellings).
 * Returns null if no recent match is found.
 */
export async function getRecentAuditByRestaurant(
  restaurantName: string,
  postcode: string,
  withinDays = 7,
): Promise<AuditRow | null> {
  await ensureAuditsTable()

  const postcodeNorm = normalizePostcode(postcode)
  const nameNorm = normalizeName(restaurantName)

  // Pull all recent rows once — used by both the deterministic check and the
  // AI fallback so we make a single DB round-trip.
  const recentRows = (await sql`
    SELECT run_id, restaurant_name, postcode, result, created_at, postcode_normalized, name_normalized
    FROM audits
    WHERE created_at >= NOW() - (${withinDays} || ' days')::interval
    ORDER BY created_at DESC
    LIMIT 25
  `) as Array<AuditRow & { postcode_normalized: string | null; name_normalized: string | null }>

  // 1) Deterministic fast-path: same normalized postcode + fuzzy name match.
  if (postcodeNorm && nameNorm) {
    const sameArea = recentRows.filter((r) => r.postcode_normalized === postcodeNorm)
    const hit = sameArea.find((row) =>
      nameMatches(nameNorm, row.name_normalized ?? normalizeName(row.restaurant_name)),
    )
    if (hit) {
      console.log(
        `[db.getRecentAuditByRestaurant] deterministic HIT runId=${hit.run_id} (postcodeNorm="${postcodeNorm}" nameNorm="${nameNorm}")`,
      )
      return hit
    }
  }

  // 2) AI fallback. Only run if we have at least one recent row to compare to.
  if (recentRows.length === 0) {
    console.log(`[db.getRecentAuditByRestaurant] no recent rows in last ${withinDays}d`)
    return null
  }

  console.log(
    `[db.getRecentAuditByRestaurant] deterministic MISS — asking AI across ${recentRows.length} candidates`,
  )

  try {
    const decision = await findMatchingAudit(
      restaurantName,
      postcode,
      recentRows.map((r) => ({
        runId: r.run_id,
        restaurantName: r.restaurant_name,
        postcode: r.postcode,
        createdAt: r.created_at,
      })),
    )

    console.log(
      `[db.getRecentAuditByRestaurant] AI decision matchedRunId=${decision.matchedRunId} confidence=${decision.confidence} reasoning="${decision.reasoning}"`,
    )

    if (!decision.matchedRunId) return null
    return recentRows.find((r) => r.run_id === decision.matchedRunId) ?? null
  } catch (err) {
    console.error("[db.getRecentAuditByRestaurant] AI fallback failed, allowing rerun:", err)
    return null
  }
}

export const FREE_PIPELINE_RUNS = 2

let usersSchemaReady: Promise<void> | null = null

export function ensureUsersTable(): Promise<void> {
  if (!usersSchemaReady) {
    usersSchemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id         TEXT PRIMARY KEY,
          email      TEXT UNIQUE NOT NULL,
          name       TEXT,
          image      TEXT,
          provider   TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
      await sql`
        CREATE TABLE IF NOT EXISTS user_pipeline_runs (
          id         SERIAL PRIMARY KEY,
          user_id    TEXT NOT NULL REFERENCES users(id),
          run_id     TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
      await sql`
        CREATE INDEX IF NOT EXISTS user_pipeline_runs_user_id_idx
          ON user_pipeline_runs (user_id)
      `
    })().catch((err) => {
      usersSchemaReady = null
      throw err
    })
  }
  return usersSchemaReady
}

export async function upsertUser(
  id: string,
  email: string,
  name: string | null,
  image: string | null,
  provider: string,
): Promise<void> {
  await ensureUsersTable()
  await sql`
    INSERT INTO users (id, email, name, image, provider)
    VALUES (${id}, ${email}, ${name}, ${image}, ${provider})
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      image = EXCLUDED.image,
      provider = EXCLUDED.provider
  `
}

export async function getUserPipelineRunCount(userId: string): Promise<number> {
  await ensureUsersTable()
  const rows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM user_pipeline_runs
    WHERE user_id = ${userId}
  `) as Array<{ count: number }>
  return rows[0]?.count ?? 0
}

export async function recordUserPipelineRun(userId: string, runId: string): Promise<void> {
  await ensureUsersTable()
  await sql`
    INSERT INTO user_pipeline_runs (user_id, run_id)
    VALUES (${userId}, ${runId})
  `
}

export async function saveAudit(
  runId: string,
  restaurantName: string,
  postcode: string,
  result: AuditResult,
): Promise<void> {
  await ensureAuditsTable()
  const postcodeNorm = normalizePostcode(postcode)
  const nameNorm = normalizeName(restaurantName)
  await sql`
    INSERT INTO audits (
      run_id, restaurant_name, postcode, result,
      postcode_normalized, name_normalized
    )
    VALUES (
      ${runId}, ${restaurantName}, ${postcode}, ${JSON.stringify(result)}::jsonb,
      ${postcodeNorm}, ${nameNorm}
    )
    ON CONFLICT (run_id) DO NOTHING
  `
}
