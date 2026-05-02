import { NextResponse } from "next/server"
import { getRun } from "workflow/api"
import { auditExists, saveAudit } from "@/lib/db"
import type { AuditResult } from "@/lib/audit-data"

type Context = { params: Promise<{ runId: string }> }

export async function GET(_req: Request, { params }: Context) {
  const { runId } = await params

  let run
  try {
    run = await getRun(runId)
  } catch {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }

  const [status, createdAt, startedAt, completedAt] = await Promise.all([
    run.status,
    run.createdAt,
    run.startedAt,
    run.completedAt,
  ])

  // Persist the result on first observation of completion. Awaiting `run.result`
  // before the run has completed would block, so we gate strictly on status.
  if (status === "completed") {
    try {
      const alreadySaved = await auditExists(runId)
      if (!alreadySaved) {
        const result = (await run.result) as AuditResult
        if (result) {
          await saveAudit(runId, result.restaurantName, result.postcode, result)
        }
      }
    } catch (err) {
      // Don't fail the status check just because persistence failed — log and
      // continue so the client can still proceed.
      console.error("[run/[runId]] failed to persist audit result", err)
    }
  }

  return NextResponse.json({
    runId,
    status,
    createdAt: createdAt.toISOString(),
    startedAt: startedAt?.toISOString() ?? null,
    completedAt: completedAt?.toISOString() ?? null,
  })
}
