import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Clock, FileText, Sparkles } from "lucide-react"
import { auth } from "@/auth"
import { getUserAuditHistory } from "@/lib/db"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function HistoryPage() {
  const session = await auth()

  if (!session?.user?.id) {
    // Not signed in — bounce them back to the landing page so they can sign
    // in. NextAuth's signIn redirect would be nicer, but a clean home-page
    // redirect avoids dragging them through a callback flow for a read-only
    // page.
    redirect("/")
  }

  const history = await getUserAuditHistory(session.user.id)

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Subtle radial glow background, matching the rest of the app */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="font-mono tracking-tight">PresenceScore</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 md:px-10 md:py-14">
        <div className="mb-8">
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">Your audits</h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
            Every audit you&apos;ve run or opened. Click through to revisit the full report.
          </p>
        </div>

        {history.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card/60 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">No audits yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Run your first audit to see it here. Reports stay available so you can come back to them anytime.
            </p>
            <Link href="/" className="mt-6 inline-block">
              <Button size="sm">Run an audit</Button>
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {history.map((row) => {
              const accessed = new Date(row.accessed_at)
              return (
                <li key={row.run_id}>
                  <Link
                    href={`/results/${row.run_id}`}
                    className="group block rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-card/70 md:p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold tracking-tight md:text-lg">
                            {row.restaurant_name}
                          </h3>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                            {row.postcode}
                          </span>
                          {row.cached && (
                            <span className="rounded-md border border-border bg-background/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              Viewed
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <time dateTime={accessed.toISOString()}>
                            {accessed.toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </time>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        {typeof row.total_score === "number" && (
                          <div className="text-right">
                            <div className="font-mono text-2xl font-semibold tabular-nums leading-none md:text-3xl">
                              {row.total_score}
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                              Score
                            </div>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                          Open →
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
