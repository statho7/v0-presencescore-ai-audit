# PresenceScore

**Free AI-powered digital presence audit for London restaurants.**

Enter a name and postcode — a durable 8-step agent pulls live data from Google Business Profile, your website, Instagram, and press coverage, scores you out of 100 across six dimensions (Discovery, Conversion, Social, Press, UGC, Competitive), benchmarks you against 5 nearby competitors, and generates 3 prioritised quick wins with estimated point impact. The full report downloads as a PDF in one click.

Built with the [Vercel Workflow SDK](https://vercel.com/docs/workflow-sdk) for durable resumable execution, [Claude Sonnet](https://anthropic.com) for structured insight, and [Bright Data](https://brightdata.com) for real-time web scraping.

**Live demo:** [www.presencescore.co.uk](https://www.presencescore.co.uk/)— try auditing BRAT Restaurant, E1 6JL.

---

## How it works

```
Input: restaurant name + postcode
        ↓
Step 1  Identity resolution     SERP → canonical name, address, GBP URL
Step 2  GBP audit               Google Maps signals — claimed, photos, hours, 3-pack
Step 3  Website audit           HTML scrape — mobile, booking widget, schema, menu
Step 4  Instagram audit         Followers, posting cadence, reels, UGC tags
Step 5  Press coverage          Google News + food media SERP, up to 100 articles
Step 6  Competitor benchmark    5 nearest venues scored on the same framework
Step 7  Score calculation       6 dimensions, 0–100, weighted per brief
Step 8  Narrative + quick wins  Claude-generated 3-paragraph summary + top 3 actions
        ↓
Output: interactive dashboard + downloadable PDF
```

Each step streams live to the frontend via SSE. The workflow is durable — if a step fails it retries independently without re-running earlier steps.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Durable workflow | Vercel Workflow SDK |
| AI reasoning | Claude Sonnet 4.6 via Vercel AI Gateway |
| Web scraping | Bright Data Web Unlocker |
| Structured outputs | Vercel AI SDK `Output.object()` + Zod |
| Charts | Recharts |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Deployment | Vercel |

---

## Local setup

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io) (or npm/yarn)
- A [Vercel](https://vercel.com) account with this project linked
- A [Bright Data](https://brightdata.com) account with a Web Unlocker zone

### 1. Clone and install

```bash
git clone https://github.com/statho7/v0-presencescore-ai-audit.git
cd v0-presencescore-ai-audit
pnpm install
```

### 2. Link to Vercel and pull environment variables

```bash
npx vercel link
npx vercel env pull .env.local
```

This pulls `VERCEL_OIDC_TOKEN` (used for the AI Gateway) and any other project env vars.

### 3. Add Bright Data credentials to `.env.local`

```bash
BRIGHTDATA_API_KEY=your_api_key_here
BRIGHTDATA_UNLOCKER_ZONE=your_zone_name_here
```

You can create a Web Unlocker zone at [brightdata.com](https://brightdata.com). The zone name is the string identifier shown in your zone settings (e.g. `web_unlocker1`).

### 4. Run the development server

```bash
npx vercel dev
```

> Use `vercel dev` rather than `next dev` — it wires up the Workflow SDK and AI Gateway correctly for local execution.

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BRIGHTDATA_API_KEY` | ✅ | Bright Data API key |
| `BRIGHTDATA_UNLOCKER_ZONE` | ✅ | Web Unlocker zone name |
| `VERCEL_OIDC_TOKEN` | ✅ | Auto-provided by Vercel; pulled via `vercel env pull` for local dev |

---

## Project structure

```
app/
  api/
    audit/          POST to start a workflow run; GET status + SSE stream
    pdf/            Legacy Puppeteer route (unused — PDF via window.print())
  page.tsx          Landing page + results view
components/
  coverage-timeline.tsx   Press chart + paginated article list
  score-dial.tsx          Animated SVG score circle
  score-bars.tsx          Dimension breakdown bars
  competitor-table.tsx    Benchmark table
  quick-wins.tsx          Action cards
  results-view.tsx        Full dashboard layout
workflows/
  audit.ts          8-step durable audit pipeline
lib/
  audit-data.ts     Shared TypeScript types
```

---

## Scoring model

| Dimension | Max | Key signals |
|-----------|-----|-------------|
| Discovery | 20 | GBP claimed, 3-pack presence, 50+ photos, hours, menu link |
| Conversion | 20 | Mobile website, booking widget, HTML menu, schema markup, allergen info |
| Social | 15 | Instagram linked, posted last 14 days, Reels, TikTok |
| Press | 25 | Coverage in 12 months, 3+ articles, Tier-1 source, positive sentiment |
| UGC | 10 | Customer Instagram tags, TikTok mentions (V2), Reddit (V2) |
| Competitive | 10 | Relative rank vs 5 nearest venues |

---

## Loom Hackathon Submission Video

[Watch the video](https://www.loom.com/share/3433a81d9bd3420aa40251149ba774ad)

---

<a href="https://v0.app/chat/api/kiro/clone/statho7/v0-presencescore-ai-audit" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
