"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Sparkles, Search, BarChart2, Zap, Github, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthButton } from "@/components/auth-button";

type LandingViewProps = {
  onSubmit: (restaurantName: string, postcode: string) => void;
  error?: string | null;
  runsUsed: number;
  runsAllowed: number;
  isSignedIn: boolean;
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.92h5.45c-.24 1.42-1.7 4.16-5.45 4.16-3.28 0-5.96-2.72-5.96-6.08s2.68-6.08 5.96-6.08c1.87 0 3.12.8 3.84 1.48l2.62-2.52C16.84 3.6 14.66 2.6 12 2.6 6.84 2.6 2.66 6.78 2.66 11.94S6.84 21.28 12 21.28c5.46 0 9.08-3.84 9.08-9.24 0-.62-.06-1.1-.16-1.84H12z"
      />
    </svg>
  );
}

export function LandingView({
  onSubmit,
  error: apiError,
  runsUsed,
  runsAllowed,
  isSignedIn,
}: LandingViewProps) {
  const [name, setName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistState, setWaitlistState] = useState<"idle" | "submitting" | "done">("idle");

  const displayError = apiError ?? error;
  const runsRemaining = Math.max(0, runsAllowed - runsUsed);
  const quotaHit = isSignedIn && runsUsed >= runsAllowed;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !postcode.trim()) {
      setError("Please enter both a restaurant name and a London postcode.");
      return;
    }
    setError(null);
    onSubmit(name.trim(), postcode.trim().toUpperCase());
  }

  async function handleWaitlistSubmit(e: FormEvent) {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    setWaitlistState("submitting");
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail.trim() }),
      });
      setWaitlistState("done");
    } catch {
      setWaitlistState("idle");
    }
  }

  const badgeText = !isSignedIn
    ? "Free AI audit · No login required"
    : quotaHit
      ? "Free audits used · Upgrade for unlimited"
      : `2 free audits · ${runsRemaining} remaining`;

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
        <nav className="flex items-center gap-3">
          <AuthButton />
        </nav>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12 md:px-10">
        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {badgeText}
          </div>

          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Find out exactly where your restaurant stands online —
            <span className="text-muted-foreground"> in 90 seconds.</span>
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            PresenceScore audits your Google profile, website, social, press and competitors, then hands you a ranked
            list of fixes you can ship this week.
          </p>

          {quotaHit ? (
            <div className="mt-10 w-full rounded-2xl border border-border bg-card/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm md:p-8">
              <h2 className="text-balance text-xl font-semibold tracking-tight md:text-2xl">
                You&apos;ve used your 2 free audits
              </h2>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                Weekly monitoring and unlimited audits are coming. Leave your email and we&apos;ll notify you when it
                launches.
              </p>

              {waitlistState === "done" ? (
                <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-border bg-background/40 px-4 py-3 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Thanks — we&apos;ll be in touch.
                </div>
              ) : (
                <form
                  onSubmit={handleWaitlistSubmit}
                  className="mt-6 flex flex-col gap-3 text-left sm:flex-row"
                >
                  <Input
                    type="email"
                    required
                    placeholder="you@restaurant.com"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    className="h-11 border-border/80 bg-background/40 text-base focus-visible:ring-primary/40"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={waitlistState === "submitting"}
                    className="h-11 sm:w-auto"
                  >
                    {waitlistState === "submitting" ? "Sending…" : "Notify me"}
                  </Button>
                </form>
              )}
            </div>
          ) : (
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

              {isSignedIn ? (
                <>
                  <Button type="submit" size="lg" className="mt-4 h-12 w-full gap-2 text-base font-medium">
                    Run audit
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    {runsRemaining} of {runsAllowed} free audits remaining
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => signIn("google", { callbackUrl: "/" })}
                      className="h-12 w-full gap-2 text-base font-medium"
                    >
                      <GoogleIcon className="h-4 w-4" />
                      Continue with Google
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => signIn("github", { callbackUrl: "/" })}
                      className="h-12 w-full gap-2 text-base font-medium"
                    >
                      <Github className="h-4 w-4" />
                      Continue with GitHub
                    </Button>
                  </div>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Sign in to run your free audit — no card required.
                  </p>
                </>
              )}
            </form>
          )}

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
              <h3 className="mb-2 text-sm font-semibold tracking-tight">Sign in & enter your details</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Sign in free with Google or GitHub — no card required.
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
