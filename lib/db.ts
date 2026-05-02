import { neon } from "@neondatabase/serverless"
import type { AuditResult } from "@/lib/audit-data"

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
 * Returns the most recent audit for a restaurant/postcode pair created within
 * the last `withinDays` days, or null if none exists.
 */
export async function getRecentAuditByRestaurant(
  restaurantName: string,
  postcode: string,
  withinDays = 7,
): Promise<AuditRow | null> {
  await ensureAuditsTable()
  const rows = (await sql`
    SELECT run_id, restaurant_name, postcode, result, created_at
    FROM audits
    WHERE LOWER(restaurant_name) = LOWER(${restaurantName})
      AND LOWER(postcode) = LOWER(${postcode})
      AND created_at >= NOW() - (${withinDays} || ' days')::interval
    ORDER BY created_at DESC
    LIMIT 1
  `) as AuditRow[]
  return rows[0] ?? null
}

export async function saveAudit(
  runId: string,
  restaurantName: string,
  postcode: string,
  result: AuditResult,
): Promise<void> {
  await ensureAuditsTable()
  await sql`
    INSERT INTO audits (run_id, restaurant_name, postcode, result)
    VALUES (${runId}, ${restaurantName}, ${postcode}, ${JSON.stringify(result)}::jsonb)
    ON CONFLICT (run_id) DO NOTHING
  `
}
