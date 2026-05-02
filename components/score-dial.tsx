"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type ScoreDialProps = {
  score: number
  restaurantName: string
  postcode: string
}

export function ScoreDial({ score, restaurantName, postcode }: ScoreDialProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    // animate from 0 to score on mount
    let raf: number
    const start = performance.now()
    const duration = 1200
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimatedScore(Math.round(eased * score))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const tone = getTone(score)
  const radius = 88
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-10">
      <div className="relative h-56 w-56 shrink-0">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--color-secondary)"
            strokeWidth="10"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={tone.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 200ms linear",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-mono text-6xl font-semibold tabular-nums",
              tone.text,
            )}
          >
            {animatedScore}
          </span>
          <span className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            of 100
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center text-center md:items-start md:text-left">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          PresenceScore
        </span>
        <h2 className="mt-1 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          {restaurantName}
        </h2>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {postcode}
        </p>
        <div
          className={cn(
            "mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
            tone.badge,
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full", tone.dot)}
            aria-hidden="true"
          />
          {tone.label}
        </div>
      </div>
    </div>
  )
}

function getTone(score: number) {
  if (score >= 70) {
    return {
      label: "Strong digital presence",
      stroke: "oklch(0.78 0.16 155)",
      text: "text-primary",
      badge:
        "border-primary/30 bg-primary/10 text-primary",
      dot: "bg-primary",
    }
  }
  if (score >= 40) {
    return {
      label: "Room to grow",
      stroke: "oklch(0.78 0.16 75)",
      text: "text-warning",
      badge:
        "border-warning/30 bg-warning/10 text-warning",
      dot: "bg-warning",
    }
  }
  return {
    label: "Critical gaps",
    stroke: "oklch(0.65 0.22 25)",
    text: "text-destructive",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  }
}
