import { NextResponse } from "next/server"
import { getAuditByRunId } from "@/lib/db"

type Context = { params: Promise<{ runId: string }> }

export async function GET(_req: Request, { params }: Context) {
  const { runId } = await params

  const row = await getAuditByRunId(runId)
  if (!row) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 })
  }

  return NextResponse.json({
    runId: row.run_id,
    restaurantName: row.restaurant_name,
    postcode: row.postcode,
    result: row.result,
    createdAt: row.created_at,
  })
}
