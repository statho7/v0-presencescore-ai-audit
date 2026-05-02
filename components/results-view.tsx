"use client";

import { Download, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompetitorTable } from "@/components/competitor-table";
import { CoverageTimeline } from "@/components/coverage-timeline";
import { QuickWins } from "@/components/quick-wins";
import { ScoreBars } from "@/components/score-bars";
import { ScoreDial } from "@/components/score-dial";
import type { AuditResult } from "@/lib/audit-data";

type ResultsViewProps = {
  result: AuditResult;
  onReset: () => void;
};

export function ResultsView({ result, onReset }: ResultsViewProps) {
  function handleDownload() {
    window.print();
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-10">
          <button onClick={onReset} className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="font-mono tracking-tight">PresenceScore</span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New audit
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 md:px-10 md:py-14">
        {/* Score dial section */}
        <section className="rounded-2xl border border-border bg-card/40 p-6 md:p-10">
          <ScoreDial score={result.totalScore} restaurantName={result.restaurantName} postcode={result.postcode} />
        </section>

        {/* Dimension bars */}
        <section className="mt-10">
          <SectionHeader
            eyebrow="Breakdown"
            title="Score by dimension"
            description="Six weighted areas, totalling 100 points."
          />
          <div className="mt-6">
            <ScoreBars dimensions={result.dimensions} />
          </div>
        </section>

        {/* Press coverage timeline */}
        <section className="mt-10">
          <SectionHeader
            eyebrow="Press"
            title="Coverage over time"
            description="Articles by quarter, coloured by sentiment."
          />
          <div className="mt-6">
            <CoverageTimeline articles={result.articles} />
          </div>
        </section>

        {/* Quick wins */}
        <section className="mt-12">
          <SectionHeader
            eyebrow="Action items"
            title="Your top 3 quick wins"
            description="Ranked by effort vs. impact. Each can ship this week."
          />
          <div className="mt-6">
            <QuickWins wins={result.quickWins} />
          </div>
        </section>

        {/* Narrative */}
        <section className="mt-12">
          <SectionHeader
            eyebrow="Summary"
            title="What this means for you"
            description="Plain-English read of your audit."
          />
          <div className="mt-6 rounded-2xl border border-border bg-card/40 p-6 md:p-8">
            <div className="space-y-5 text-pretty text-base leading-relaxed text-foreground/90">
              {result.narrative
                .filter((para) => !para.startsWith("#"))
                .map((para, idx) => (
                  <p key={idx}>{para.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1")}</p>
                ))}
            </div>
          </div>
        </section>

        {/* Competitor table */}
        <section className="mt-12">
          <SectionHeader
            eyebrow="Benchmarks"
            title="How you compare"
            description="Your row is highlighted. Sorted by PresenceScore."
          />
          <div className="mt-6">
            <CompetitorTable competitors={result.competitors} />
          </div>
        </section>

        {/* Download */}
        <section className="mt-12 flex flex-col items-start gap-3 border-t border-border/60 pt-8">
          <Button variant="outline" size="lg" onClick={handleDownload} className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Download PDF report
          </Button>
          <p className="text-xs text-muted-foreground">
            Includes the full breakdown, narrative and a 30-day action plan.
          </p>
        </section>
      </main>

      <footer className="border-t border-border/60 px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-xs text-muted-foreground md:flex-row">
          <span>
            Audit generated for {result.restaurantName} ({result.postcode})
          </span>
          <span className="font-mono">PresenceScore v0.1</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs uppercase tracking-widest text-primary">{eyebrow}</span>
      <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
