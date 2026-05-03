import { Check, X } from "lucide-react"
import type { Competitor } from "@/lib/audit-data"
import { cn } from "@/lib/utils"

type CompetitorTableProps = {
  competitors: Competitor[]
}

export function CompetitorTable({ competitors }: CompetitorTableProps) {
  const sorted = [...competitors].sort((a, b) => b.score - a.score)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background/30">
            <tr className="text-left">
              <Th>Restaurant</Th>
              <Th align="right">
                <span title="Competitor scores are shown as 10-point ranges to account for pipeline estimation variance.">
                  Score{" "}
                  <span className="font-normal normal-case tracking-normal text-muted-foreground/60">
                    (range)
                  </span>
                </span>
              </Th>
              <Th align="right">GBP photos</Th>
              <Th align="right">Press mentions</Th>
              <Th align="center">Booking link</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, idx) => (
              <tr
                key={c.name + idx}
                className={cn(
                  "border-b border-border/60 last:border-0 transition-colors",
                  c.isYou
                    ? "bg-primary/[0.06] hover:bg-primary/[0.09]"
                    : "hover:bg-background/40",
                )}
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-medium",
                        c.isYou && "text-primary",
                      )}
                    >
                      {c.name}
                    </span>
                    {c.isYou && (
                      <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                        You
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      getScoreTone(c.score),
                    )}
                  >
                    {c.isYou ? c.score : (c.scoreRange ?? c.score)}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right font-mono tabular-nums text-muted-foreground">
                  {c.gbpPhotos}
                </td>
                <td className="px-4 py-3.5 text-right font-mono tabular-nums text-muted-foreground">
                  {c.pressMentions}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-center">
                    {c.bookingLink ? (
                      <Check
                        className="h-4 w-4 text-primary"
                        strokeWidth={2.5}
                        aria-label="Has booking link"
                      />
                    ) : (
                      <X
                        className="h-4 w-4 text-destructive"
                        strokeWidth={2.5}
                        aria-label="No booking link"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode
  align?: "left" | "right" | "center"
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground",
        align === "right" && "text-right",
        align === "center" && "text-center",
      )}
    >
      {children}
    </th>
  )
}

function getScoreTone(score: number) {
  if (score >= 70) return "text-primary"
  if (score >= 40) return "text-warning"
  return "text-destructive"
}
