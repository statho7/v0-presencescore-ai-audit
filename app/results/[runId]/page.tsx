import { redirect } from "next/navigation"
import { getAuditByRunId } from "@/lib/db"
import { ResultsViewClient } from "@/components/results-view-client"

type PageProps = {
  params: Promise<{ runId: string }>
}

export const dynamic = "force-dynamic"

export default async function ResultsPage({ params }: PageProps) {
  const { runId } = await params

  const row = await getAuditByRunId(runId)

  if (!row) {
    // Audit doesn't exist in the DB yet (still running, or invalid runId).
    // Bounce back to the home page with the runId so the SSE stream can pick
    // it up and finish the audit interactively.
    redirect(`/?runId=${encodeURIComponent(runId)}`)
  }

  const createdAt = new Date(row.created_at)
  const ageMs = Date.now() - createdAt.getTime()
  const isRecent = ageMs < 7 * 24 * 60 * 60 * 1000

  return (
    <ResultsViewClient
      result={row.result}
      cachedAt={isRecent ? row.created_at : undefined}
    />
  )
}
