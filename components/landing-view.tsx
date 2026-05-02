"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Sparkles, Search, BarChart2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LandingViewProps = {
  onSubmit: (restaurantName: string, postcode: string) => void;
  error?: string | null;
};

export function LandingView({ onSubmit, error: apiError }: LandingViewProps) {
  const [name, setName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const displayError = apiError ?? error;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !postcode.trim()) {
      setError("Please enter both a restaurant name and a London postcode.");
      return;
    }
    setError(null);
    onSubmit(name.trim(), postcode.trim().toUpperCase());
  }

  return (
    <div id="top" className="relative flex min-h-screen flex-col">
      {/* Subtle radial glow background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <header className="flex items-center justify-between px-6 py-6 md:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-mono text-sm tracking-tight">PresenceScore</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a className="hover:text-foreground transition-colors" href="#how">
            How it works
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
            PresenceScore audits your Google profile, website, social, press and competitors, then hands you a ranked
            list of fixes you can ship this week.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 w-full rounded-2xl border border-border bg-card/60 p-4 shadow-2xl shadow-black/40 backdrop-blur-sm md:p-5"
          >
            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div className="flex flex-col gap-2 text-left">
                <Label htmlFor="restaurant" className="text-xs uppercase tracking-wider text-muted-foreground">
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
                <Label htmlFor="postcode" className="text-xs uppercase tracking-wider text-muted-foreground">
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
              <p role="alert" className="mt-3 text-left text-sm text-destructive">
                {displayError}
              </p>
            )}

            <Button type="submit" size="lg" className="mt-4 h-12 w-full gap-2 text-base font-medium">
              Run audit
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p id="trust" className="mt-6 text-sm text-muted-foreground">
            Used by <span className="text-foreground">500+ London restaurants</span> · Updated daily
          </p>
        </div>
      </main>

      {/* How it works */}
      <section id="how" className="border-t border-border/60 px-6 py-20 md:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
              Your full online audit delivered in under two minutes — no account needed.
            </p>
          </div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Connector line (desktop only) */}
            <div
              aria-hidden="true"
              className="absolute left-[calc(16.666%+1rem)] right-[calc(16.666%+1rem)] top-8 hidden h-px bg-border md:block"
            />

            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                <Search className="h-6 w-6 text-primary" />
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  1
                </span>
              </div>
              <h3 className="mb-2 text-sm font-semibold tracking-tight">Enter your details</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Just your restaurant name and London postcode. Nothing else — no sign-up, no card.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                <Sparkles className="h-6 w-6 text-primary" />
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  2
                </span>
              </div>
              <h3 className="mb-2 text-sm font-semibold tracking-tight">AI audits your presence</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We scan your Google profile, website, social channels, press mentions, and nearby competitors.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                <BarChart2 className="h-6 w-6 text-primary" />
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  3
                </span>
              </div>
              <h3 className="mb-2 text-sm font-semibold tracking-tight">Get your score and fixes</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Receive a ranked list of actionable improvements — ordered by impact so you know exactly what to tackle
                first.
              </p>
            </div>
          </div>

          {/* CTA nudge */}
          <div className="mt-12 flex justify-center">
            <a href="#top">
              <Button variant="outline" size="sm" className="gap-2">
                <Zap className="h-3.5 w-3.5" />
                Run your free audit now
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-xs text-muted-foreground md:flex-row">
          <span>&copy; {new Date().getFullYear()} PresenceScore. Built for London hospitality.</span>
          <span className="font-mono">v0.1</span>
        </div>
      </footer>
    </div>
  );
}
