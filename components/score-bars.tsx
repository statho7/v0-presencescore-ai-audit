import type { ScoreDimension } from "@/lib/audit-data"
import { cn } from "@/lib/utils"

type ScoreBarsProps = {
  dimensions: ScoreDimension[]
}

export function ScoreBars({ dimensions }: ScoreBarsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {dimensions.map((d) => {
        const pct = Math.round((d.score / d.max) * 100)
        const tone = getBarTone(pct)
        return (
          <div
            key={d.key}
            className="rounded-xl border border-border bg-card/40 p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-medium">{d.label}</h3>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                <span className={cn("text-foreground", tone.text)}>
                  {d.score}
                </span>
                <span className="text-muted-foreground">/{d.max}</span>
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full", tone.bg)}
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={d.score}
                aria-valuemin={0}
                aria-valuemax={d.max}
                aria-label={`${d.label} score`}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {d.description}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function getBarTone(pct: number) {
  if (pct >= 70) return { bg: "bg-primary", text: "text-primary" }
  if (pct >= 40) return { bg: "bg-warning", text: "text-warning" }
  return { bg: "bg-destructive", text: "text-destructive" }
}
