"use client"

import { useState } from "react"
import { LandingView } from "@/components/landing-view"
import { ResultsView } from "@/components/results-view"
import { RunningView } from "@/components/running-view"
import type { AuditResult } from "@/lib/audit-data"

type Stage = "landing" | "running" | "results"

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing")
  const [restaurantName, setRestaurantName] = useState("")
  const [postcode, setPostcode] = useState("")
  const [runId, setRunId] = useState<string | null>(null)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(name: string, code: string) {
    setRestaurantName(name)
    setPostcode(code)
    setError(null)

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName: name, postcode: code }),
      })

      if (!res.ok) throw new Error("Failed to start audit")
      const { runId } = await res.json()
      setRunId(runId)
      setStage("running")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start audit")
    }
  }

  function handleAuditComplete(auditResult: AuditResult) {
    setResult(auditResult)
    setStage("results")
  }

  function handleReset() {
    setStage("landing")
    setResult(null)
    setRunId(null)
    setError(null)
  }

  if (stage === "landing") {
    return <LandingView onSubmit={handleSubmit} error={error} />
  }

  if (stage === "running" && runId) {
    return (
      <RunningView
        restaurantName={restaurantName}
        postcode={postcode}
        runId={runId}
        onComplete={handleAuditComplete}
      />
    )
  }

  if (stage === "results" && result) {
    return <ResultsView result={result} onReset={handleReset} />
  }

  return null
}
