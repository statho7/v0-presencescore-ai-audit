"use client"

import { useState } from "react"
import { LandingView } from "@/components/landing-view"
import { ResultsView } from "@/components/results-view"
import { RunningView } from "@/components/running-view"
import { generateAuditResult, type AuditResult } from "@/lib/audit-data"

type Stage = "landing" | "running" | "results"

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing")
  const [restaurantName, setRestaurantName] = useState("")
  const [postcode, setPostcode] = useState("")
  const [result, setResult] = useState<AuditResult | null>(null)

  function handleSubmit(name: string, code: string) {
    setRestaurantName(name)
    setPostcode(code)
    setStage("running")
  }

  function handleAuditComplete() {
    setResult(generateAuditResult(restaurantName, postcode))
    setStage("results")
  }

  function handleReset() {
    setStage("landing")
    setResult(null)
  }

  if (stage === "landing") {
    return <LandingView onSubmit={handleSubmit} />
  }

  if (stage === "running") {
    return (
      <RunningView
        restaurantName={restaurantName}
        postcode={postcode}
        onComplete={handleAuditComplete}
      />
    )
  }

  if (stage === "results" && result) {
    return <ResultsView result={result} onReset={handleReset} />
  }

  return null
}
