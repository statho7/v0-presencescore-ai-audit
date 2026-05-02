"use client"

import { useRouter } from "next/navigation"
import { ResultsView } from "@/components/results-view"
import type { AuditResult } from "@/lib/audit-data"

type ResultsViewClientProps = {
  result: AuditResult
  cachedAt?: string
}

export function ResultsViewClient({ result, cachedAt }: ResultsViewClientProps) {
  const router = useRouter()

  function handleReset() {
    router.push("/")
  }

  return <ResultsView result={result} onReset={handleReset} cachedAt={cachedAt} />
}
