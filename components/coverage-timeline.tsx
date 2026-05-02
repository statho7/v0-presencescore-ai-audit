"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import type { CoverageArticle } from "@/lib/audit-data"

type CoverageTimelineProps = { articles: CoverageArticle[] }

function getQuarterLabel(q: number, year: number) {
  return `Q${q} '${String(year).slice(2)}`
}

function buildQuarters() {
  const now = new Date()
  const quarters: { label: string; year: number; q: number }[] = []
  let year = now.getFullYear()
  let q = Math.ceil((now.getMonth() + 1) / 3)
  for (let i = 0; i < 8; i++) {
    quarters.unshift({ label: getQuarterLabel(q, year), year, q })
    q--
    if (q === 0) { q = 4; year-- }
  }
  return quarters
}

export function CoverageTimeline({ articles }: CoverageTimelineProps) {
  const quarters = useMemo(() => buildQuarters(), [])

  const data = useMemo(() => {
    return quarters.map(({ label, year, q }) => {
      const bucket = articles.filter((a) => {
        const d = new Date(a.date)
        return d.getFullYear() === year && Math.ceil((d.getMonth() + 1) / 3) === q
      })
      return {
        label,
        positive: bucket.filter((a) => a.sentiment === "positive").length,
        neutral: bucket.filter((a) => a.sentiment === "neutral").length,
        negative: bucket.filter((a) => a.sentiment === "negative").length,
      }
    })
  }, [articles, quarters])

  const tier1Count = articles.filter((a) => a.tier === "tier1").length
  const positivePct = articles.length
    ? Math.round((articles.filter((a) => a.sentiment === "positive").length / articles.length) * 100)
    : 0

  if (articles.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-4 flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">No press coverage found in the last 24 months.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <p className="font-mono text-xs text-muted-foreground">
        {articles.length} articles · {tier1Count} from Tier 1 outlets · {positivePct}% positive
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barSize={22} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted-foreground) / 0.08)" }}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: 12,
            }}
          />
          <Bar dataKey="positive" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
          <Bar dataKey="neutral" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="negative" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
