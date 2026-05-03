"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Loader2, AlertCircle } from "lucide-react"
import { AUDIT_STEPS } from "@/lib/audit-data"
import type { AuditResult } from "@/lib/audit-data"
import type { AuditEvent } from "@/workflows/audit"
import { cn } from "@/lib/utils"

type StepStatus = "pending" | "running" | "complete" | "error"

type RunningViewProps = {
  restaurantName: string
  postcode: string
  runId: string
  onComplete: (result: AuditResult) => void
}

export function RunningView({ restaurantName, postcode, runId, onComplete }: RunningViewProps) {
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({})
  const [stepLogs, setStepLogs] = useState<Record<string, string>>({})
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const completedCount = Object.values(stepStatuses).filter((s) => s === "complete").length
  const progress = Math.round((completedCount / AUDIT_STEPS.length) * 100)

  useEffect(() => {
    let es: EventSource | null = null
    let pollTimerId: ReturnType<typeof setTimeout> | null = null
    let done = false

    function cleanup() {
      done = true
      es?.close()
      if (pollTimerId) clearTimeout(pollTimerId)
    }

    async function pollForCompletion() {
      if (done) return
      try {
        const runRes = await fetch(`/api/audit/run/${runId}`)
        if (runRes.ok) {
          const run = await runRes.json()
          if (run.status === "completed") {
            const resultRes = await fetch(`/api/audit/result/${runId}`)
            if (resultRes.ok) {
              const data = await resultRes.json()
              if (data.result) {
                done = true
                setIsReconnecting(false)
                onCompleteRef.current(data.result)
                return
              }
            }
          } else if (run.status === "failed") {
            setFatalError("Audit failed. Please try again.")
            return
          }
        }
      } catch {
        // network error, keep polling
      }
      if (!done) {
        pollTimerId = setTimeout(pollForCompletion, 3000)
      }
    }

    es = new EventSource(`/api/audit/readable/${runId}`)

    es.onmessage = (e) => {
      let event: AuditEvent
      try {
        event = JSON.parse(e.data)
      } catch {
        return
      }

      if (event.type === "step_start") {
        setStepStatuses((prev) => ({ ...prev, [event.stepId]: "running" }))
      } else if (event.type === "step_done") {
        setStepStatuses((prev) => ({ ...prev, [event.stepId]: "complete" }))
        setStepLogs((prev) => ({ ...prev, [event.stepId]: event.log }))
      } else if (event.type === "step_error") {
        setStepStatuses((prev) => ({ ...prev, [event.stepId]: "error" }))
        setStepLogs((prev) => ({ ...prev, [event.stepId]: event.error }))
      } else if (event.type === "done") {
        done = true
        es?.close()
        onCompleteRef.current(event.result)
      }
    }

    es.onerror = () => {
      es?.close()
      es = null
      if (!done) {
        setIsReconnecting(true)
        pollTimerId = setTimeout(pollForCompletion, 2000)
      }
    }

    return cleanup
  }, [runId])

  if (fatalError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">{fatalError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-12 md:px-10">
        <div className="w-full max-w-2xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              {isReconnecting ? "Finishing up…" : "Auditing"}
            </div>
            <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
              Running PresenceScore for{" "}
              <span className="text-primary">{restaurantName}</span>
            </h1>
            <p className="mt-2 font-mono text-sm text-muted-foreground">
              {postcode} · {AUDIT_STEPS.length} checks
            </p>

            <div className="mt-6 h-1 w-full max-w-sm overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="mt-2 font-mono text-xs text-muted-foreground">{progress}%</span>
          </div>

          <ol className="space-y-2">
            {AUDIT_STEPS.map((step, idx) => {
              const status = stepStatuses[step.id] ?? "pending"
              const log = stepLogs[step.id]
              return (
                <li
                  key={step.id}
                  className={cn(
                    "rounded-xl border bg-card/40 p-4 transition-all duration-300",
                    status === "pending" && "border-border/50 opacity-60",
                    status === "running" && "border-primary/40 bg-primary/[0.04] shadow-lg shadow-primary/5",
                    status === "complete" && "border-border",
                    status === "error" && "border-destructive/40",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <StepIcon status={status} />
                    <span
                      className={cn(
                        "flex-1 text-sm md:text-base",
                        status === "pending" && "text-muted-foreground",
                        status === "running" && "text-foreground",
                        status === "complete" && "text-foreground",
                        status === "error" && "text-destructive",
                      )}
                    >
                      {step.label}
                      {status === "running" && <span className="ml-1 text-primary">…</span>}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(idx + 1).padStart(2, "0")}/{String(AUDIT_STEPS.length).padStart(2, "0")}
                    </span>
                  </div>

                  {(status === "complete" || status === "error") && log && (
                    <p className="mt-2 pl-8 font-mono text-xs leading-relaxed text-muted-foreground">
                      {"› "}{log}
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </main>
    </div>
  )
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "complete") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-3 w-3" strokeWidth={3} />
      </div>
    )
  }
  if (status === "running") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    )
  }
  if (status === "error") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/20">
        <AlertCircle className="h-3 w-3 text-destructive" />
      </div>
    )
  }
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
      <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
    </div>
  )
}
