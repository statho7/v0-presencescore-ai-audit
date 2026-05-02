import { neon } from "@neondatabase/serverless"
import type { AuditResult } from "@/lib/audit-data"
import { nameMatches, normalizeName, normalizePostcode } from "@/lib/normalize"

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
 * Returns the most recent audit for a restaurant created within the last
 * `withinDays` days, using fuzzy matching that's tolerant of:
 *   - "BRAT" vs "BRAT Restaurant" (stopwords stripped, substring match)
 *   - "E1 6JL" vs "4 Redchurch St, London E1 6JL" (postcode extracted)
 *   - whitespace / case variations on either side
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

  // If we can't extract a postcode from the user's input we have no reliable
  // anchor and fall back to just letting the audit run.
  if (!postcodeNorm || !nameNorm) {
    console.log(
      `[db.getRecentAuditByRestaurant] skip: cannot normalize input name="${restaurantName}" postcode="${postcode}"`,
    )
    return null
  }

  // Pull recent rows for the same postcode, then do the fuzzy name match in JS
  // (cheap because most postcodes will have at most 1-2 matching rows).
  const rows = (await sql`
    SELECT run_id, restaurant_name, postcode, result, created_at, postcode_normalized, name_normalized
    FROM audits
    WHERE postcode_normalized = ${postcodeNorm}
      AND created_at >= NOW() - (${withinDays} || ' days')::interval
    ORDER BY created_at DESC
    LIMIT 10
  `) as Array<AuditRow & { postcode_normalized: string | null; name_normalized: string | null }>

  const hit = rows.find((row) => nameMatches(nameNorm, row.name_normalized ?? normalizeName(row.restaurant_name)))

  console.log(
    `[db.getRecentAuditByRestaurant] postcodeNorm="${postcodeNorm}" nameNorm="${nameNorm}" candidates=${rows.length} hit=${hit?.run_id ?? "none"}`,
  )

  return hit ?? null
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
