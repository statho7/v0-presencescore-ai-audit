"use client"

import { useEffect, useState } from "react"
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
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Resume an in-flight audit when arriving via /?runId=... — this happens
  // when /results/[runId] redirects here because the audit hasn't been
  // persisted to the DB yet. The SSE stream will pick up the run and emit
  // the "done" event with the full result.
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const resumeRunId = params.get("runId")
    if (resumeRunId) {
      setRunId(resumeRunId)
      setStage("running")
    }
  }, [])

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
      const data = await res.json()
      setRunId(data.runId)

      if (data.cached) {
        // Recent audit found — skip the workflow and go straight to results.
        setCachedAt(data.cachedAt)
        setResult(data.result)
        setStage("results")
        if (typeof window !== "undefined") {
          window.history.pushState({}, "", `/results/${data.runId}`)
        }
        return
      }

      setStage("running")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start audit")
    }
  }

  function handleAuditComplete(auditResult: AuditResult) {
    setResult(auditResult)
    setStage("results")
    // Update the browser URL to a shareable, refreshable results URL without
    // triggering a full navigation — the server route at /results/[runId]
    // will load this state from Neon on refresh or share.
    if (runId && typeof window !== "undefined") {
      window.history.pushState({}, "", `/results/${runId}`)
    }
  }

  function handleReset() {
    setStage("landing")
    setResult(null)
    setRunId(null)
    setCachedAt(null)
    setError(null)
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/")
    }
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
    return <ResultsView result={result} onReset={handleReset} cachedAt={cachedAt ?? undefined} />
  }

  return null
}
