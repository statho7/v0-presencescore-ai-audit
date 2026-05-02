import {
  Camera,
  Code2,
  Instagram,
  LinkIcon,
  type LucideIcon,
} from "lucide-react"
import type { QuickWin } from "@/lib/audit-data"

const ICONS: Record<QuickWin["icon"], LucideIcon> = {
  link: LinkIcon,
  camera: Camera,
  instagram: Instagram,
  schema: Code2,
}

type QuickWinsProps = {
  wins: QuickWin[]
}

export function QuickWins({ wins }: QuickWinsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {wins.map((win, idx) => {
        const Icon = ICONS[win.icon]
        return (
          <article
            key={idx}
            className="group relative flex flex-col rounded-xl border border-border bg-card/40 p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                #{idx + 1}
              </span>
            </div>

            <h3 className="mt-4 text-balance text-base font-medium leading-snug">
              {win.title}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              {win.description}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background/40 px-2 py-1 font-mono text-xs text-muted-foreground">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                {win.time}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-xs text-primary">
                {win.impact}
              </span>
            </div>
          </article>
        )
      })}
    </div>
  )
}
