"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LandingViewProps = {
  onSubmit: (restaurantName: string, postcode: string) => void
  error?: string | null
}

export function LandingView({ onSubmit, error: apiError }: LandingViewProps) {
  const [name, setName] = useState("")
  const [postcode, setPostcode] = useState("")
  const [error, setError] = useState<string | null>(null)

  const displayError = apiError ?? error

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !postcode.trim()) {
      setError("Please enter both a restaurant name and a London postcode.")
      return
    }
    setError(null)
    onSubmit(name.trim(), postcode.trim().toUpperCase())
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Subtle radial glow background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-10%] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <header className="flex items-center justify-between px-6 py-6 md:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-mono text-sm tracking-tight">
            PresenceScore
          </span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a className="hover:text-foreground" href="#how">
            How it works
          </a>
          <a className="hover:text-foreground" href="#trust">
            Customers
          </a>
        </nav>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12 md:px-10">
        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Free AI audit · No login required
          </div>

          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Find out exactly where your restaurant stands online —
            <span className="text-muted-foreground"> in 90 seconds.</span>
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            PresenceScore audits your Google profile, website, social, press
            and competitors, then hands you a ranked list of fixes you can
            ship this week.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 w-full rounded-2xl border border-border bg-card/60 p-4 shadow-2xl shadow-black/40 backdrop-blur-sm md:p-5"
          >
            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div className="flex flex-col gap-2 text-left">
                <Label
                  htmlFor="restaurant"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Restaurant name
                </Label>
                <Input
                  id="restaurant"
                  placeholder="e.g. Brawn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 border-border/80 bg-background/40 text-base focus-visible:ring-primary/40"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-2 text-left">
                <Label
                  htmlFor="postcode"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  London postcode
                </Label>
                <Input
                  id="postcode"
                  placeholder="E1 6RF"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className="h-11 border-border/80 bg-background/40 font-mono text-base uppercase focus-visible:ring-primary/40"
                  autoComplete="off"
                />
              </div>
            </div>

            {displayError && (
              <p
                role="alert"
                className="mt-3 text-left text-sm text-destructive"
              >
                {displayError}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="mt-4 h-12 w-full gap-2 text-base font-medium"
            >
              Run audit
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p
            id="trust"
            className="mt-6 text-sm text-muted-foreground"
          >
            Used by{" "}
            <span className="text-foreground">500+ London restaurants</span>{" "}
            · Updated daily
          </p>
        </div>
      </main>

      <footer className="border-t border-border/60 px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-xs text-muted-foreground md:flex-row">
          <span>
            &copy; {new Date().getFullYear()} PresenceScore. Built for London
            hospitality.
          </span>
          <span className="font-mono">v1.0</span>
        </div>
      </footer>
    </div>
  )
}
