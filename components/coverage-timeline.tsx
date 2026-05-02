"use client"

import { useMemo, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import type { CoverageArticle } from "@/lib/audit-data"

// Hardcoded to match the dark theme oklch tokens
const COLOR = {
  positive: "#4ade80",   // green — matches primary oklch(0.78 0.16 155)
  neutral:  "#facc15",   // amber — matches warning oklch(0.78 0.16 75)
  negative: "#f87171",   // red   — matches destructive oklch(0.65 0.22 25)
}

const TIER_LABEL: Record<CoverageArticle["tier"], string> = {
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
}

const PAGE_SIZE = 5

type CoverageTimelineProps = { articles: CoverageArticle[] }

function buildQuarters(articles: CoverageArticle[]) {
  const now = new Date()
  const endYear = now.getFullYear()
  const endQ = Math.ceil((now.getMonth() + 1) / 3)

  // Start from earliest article date, minimum 8 quarters back
  const minStart = new Date(now)
  minStart.setMonth(minStart.getMonth() - 21) // ~7 quarters back = 8 total
  const earliest = articles.reduce<Date>((min, a) => {
    if (!a.date) return min
    const d = new Date(a.date)
    return d < min ? d : min
  }, minStart)

  let startYear = earliest.getFullYear()
  let startQ = Math.ceil((earliest.getMonth() + 1) / 3)

  const quarters: { label: string; year: number; q: number }[] = []
  let year = startYear
  let q = startQ
  while (year < endYear || (year === endYear && q <= endQ)) {
    quarters.push({ label: `Q${q} '${String(year).slice(2)}`, year, q })
    q++
    if (q > 4) { q = 1; year++ }
  }
  return quarters
}

function formatDate(iso: string) {
  if (!iso) return "Date unknown"
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const pos = payload.find((p: any) => p.dataKey === "positive")?.value ?? 0
  const neu = payload.find((p: any) => p.dataKey === "neutral")?.value ?? 0
  const neg = payload.find((p: any) => p.dataKey === "negative")?.value ?? 0
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg space-y-1 min-w-[120px]">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {pos > 0 && <p style={{ color: COLOR.positive }}>Positive: {pos}</p>}
      {neu > 0 && <p style={{ color: COLOR.neutral }}>Neutral: {neu}</p>}
      {neg > 0 && <p style={{ color: COLOR.negative }}>Negative: {neg}</p>}
      {pos + neu + neg === 0 && <p className="text-muted-foreground">No coverage</p>}
    </div>
  )
}

export function CoverageTimeline({ articles = [] }: CoverageTimelineProps) {
  const [page, setPage] = useState(0)

  const quarters = useMemo(() => buildQuarters(articles), [articles])

  const data = useMemo(() => {
    return quarters.map(({ label, year, q }) => {
      const bucket = articles.filter((a) => {
        if (!a.date) return false
        const d = new Date(a.date)
        return d.getFullYear() === year && Math.ceil((d.getMonth() + 1) / 3) === q
      })
      return {
        label,
        positive: bucket.filter((a) => a.sentiment === "positive").length,
        neutral:  bucket.filter((a) => a.sentiment === "neutral").length,
        negative: bucket.filter((a) => a.sentiment === "negative").length,
      }
    })
  }, [articles, quarters])

  const tier1Count  = articles.filter((a) => a.tier === "tier1").length
  const positivePct = articles.length
    ? Math.round((articles.filter((a) => a.sentiment === "positive").length / articles.length) * 100)
    : 0

  const sorted = useMemo(
    () => [...articles].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [articles]
  )

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (articles.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-6 flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">No press coverage found in the last 24 months.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chart card */}
      <div className="rounded-xl border border-border bg-card/40 p-5 space-y-4">
        {/* Summary row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-mono text-xs text-muted-foreground">
            {articles.length} {articles.length === 1 ? "article" : "articles"}
          </span>
          <span className="font-mono text-xs text-muted-foreground">·</span>
          <span className="font-mono text-xs text-muted-foreground">{tier1Count} Tier 1</span>
          <span className="font-mono text-xs text-muted-foreground">·</span>
          <span className="font-mono text-xs" style={{ color: COLOR.positive }}>{positivePct}% positive</span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          {(["positive", "neutral", "negative"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COLOR[s] }} />
              <span className="text-xs capitalize text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>

        {/* Bar chart — spans full article history */}
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} barSize={Math.max(8, Math.min(24, Math.floor(600 / quarters.length)))} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "oklch(0.68 0.01 270)" }}
              axisLine={false}
              tickLine={false}
              interval={quarters.length > 16 ? Math.ceil(quarters.length / 8) - 1 : 0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "oklch(0.68 0.01 270)" }}
              axisLine={false}
              tickLine={false}
              width={20}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.27 0.005 270 / 0.5)" }} />
            <Bar dataKey="positive" stackId="a" fill={COLOR.positive} radius={[0, 0, 0, 0]} />
            <Bar dataKey="neutral"  stackId="a" fill={COLOR.neutral}  radius={[0, 0, 0, 0]} />
            <Bar dataKey="negative" stackId="a" fill={COLOR.negative} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Article list with pagination */}
      <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
        <div className="divide-y divide-border">
          {paginated.map((article, i) => (
            <a
              key={i}
              href={article.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-start gap-3 min-w-0">
                {/* Sentiment dot */}
                <span
                  className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: COLOR[article.sentiment] }}
                />
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium leading-snug truncate group-hover:text-primary transition-colors">
                    {article.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {article.source}
                    <span className="mx-1.5">·</span>
                    {formatDate(article.date)}
                    <span className="mx-1.5">·</span>
                    <span
                      className="font-mono text-[10px] px-1 py-0.5 rounded"
                      style={{
                        color: article.tier === "tier1" ? COLOR.positive : "oklch(0.68 0.01 270)",
                        background: article.tier === "tier1" ? "oklch(0.78 0.16 155 / 0.12)" : "oklch(0.235 0.005 270)",
                      }}
                    >
                      {TIER_LABEL[article.tier]}
                    </span>
                  </p>
                </div>
              </div>
              <ExternalLink
                size={14}
                className="flex-shrink-0 mt-1 text-muted-foreground group-hover:text-primary transition-colors"
              />
            </a>
          ))}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="font-mono text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className="flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs transition-colors hover:bg-muted/50"
                  style={{
                    background: i === page ? "oklch(0.78 0.16 155 / 0.15)" : undefined,
                    color: i === page ? COLOR.positive : undefined,
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
