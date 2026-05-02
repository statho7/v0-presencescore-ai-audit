# PresenceScore — Build Status & Gap Tracker
### Last updated: 2026-05-02 (session 2)

---

## Overall Assessment

**~99% MVP-complete. Verified working end-to-end on Vercel production.** All 8 pipeline steps live with real external data. Full UI built and verified. PDF download working via browser print (window.print() + print CSS — no server dependency). One scoring signal (engagement above median) structurally deferred. Press recency now computed from extracted ISO dates (not Claude inference). Article links resolved from SERP HTML.

---

## Pipeline Status

| Step | Brief spec | Status | Notes |
|------|-----------|--------|-------|
| Identity resolution | Name, address, GBP URL, competitor set | ✅ Working | SERP → Claude structured output |
| GBP audit | Claimed, photos, hours, booking, 3-pack | ✅ Working | Photo count inferred from reviews |
| Website audit | Loads, mobile, booking, schema, menu, allergen | ✅ Working | HTML scraped via Bright Data Web Unlocker |
| Instagram audit | Account, followers, frequency, reels, engagement | ✅ Working | Direct fetch → SERP fallback; `postedLast14Days` + `customerInstagramPosts` extracted |
| Press coverage | Google News scrape, sentiment, tier classification | ✅ Working | Dual SERP (news + site-filtered), date-sorted, up to 100 results, per-article source/date/url extracted |
| Competitor benchmark | 5 nearest venues, side-by-side scoring | ✅ Working | Single SERP + structured output |
| Score calculation | 6 dimensions, 0–100 | ✅ Working | Matches brief's weighting exactly |
| Narrative + quick wins | 3 paragraphs + top 3 actions | ✅ Working | Claude-generated, no parse errors |

---

## Frontend Status

| Component | Status | Notes |
|-----------|--------|-------|
| Landing / input form | ✅ Built | Restaurant name + postcode, validation, "How it works" section |
| Running view (live progress) | ✅ Built | EventSource SSE stream, per-step status icons, live log lines |
| Results dashboard | ✅ Built | Score dial, dimension bars, quick wins cards, 3-paragraph narrative |
| Score dial (0–100, colour-coded) | ✅ Built | SVG animated circle, green/amber/red zones |
| Dimension score bars (6 dims) | ✅ Built | Discovery, Conversion, Social, Press, UGC, Competitive |
| Coverage timeline chart | ✅ Built | Dynamic quarter range from earliest article date, stacked bar chart (recharts), colour by sentiment |
| Coverage article list | ✅ Built | Paginated (5/page), sentiment dot, tier badge, external link |
| Competitor comparison table | ✅ Built | User row highlighted |
| Quick wins cards | ✅ Built | Action, time estimate, impact points, icon mapping |
| PDF download | ✅ Built & Working | `window.print()` + `@media print` CSS — no server dependency, works on Vercel |

---

## API Routes

| Route | Status | Notes |
|-------|--------|-------|
| `POST /api/audit` | ✅ Working | Starts durable workflow, returns `runId` |
| `GET /api/audit/run/[runId]` | ✅ Working | Returns workflow status + metadata |
| `GET /api/audit/readable/[runId]` | ✅ Working | SSE stream of step events to frontend |
| `POST /api/pdf` | ⚠️ Unused | Route still exists but frontend now uses window.print() |

---

## Scoring Model Alignment

### Discovery (20pts)
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| GBP claimed and active | 4pts | ✅ 4pts | — |
| Appears in local 3-pack | 5pts | ✅ 5pts | — |
| 50+ photos on GBP | 3pts | ✅ 3pts (inferred) | Photo count inferred from review count |
| Hours set | 2pts | ✅ 2pts | — |
| Menu link on GBP | 2pts | ✅ 2pts | — |
| Category specific | 2pts | ✅ 2pts | — |
| Booking link on GBP | 2pts | ✅ 2pts | — |

### Conversion (20pts)
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| Website loads on mobile | 4pts | ✅ 4pts | — |
| HTML menu (not PDF) | 3pts | ✅ 3pts | — |
| Booking widget | 4pts | ✅ 4pts | — |
| Schema.org markup | 3pts | ✅ 3pts | — |
| Allergen info | 2pts | ✅ 2pts | — |
| Social links on site | 2pts | ⚠️ possible 2pts | First 6KB truncation may miss footer links |
| About/story page | 2pts | ✅ 2pts | — |

### Social (15pts)
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| Instagram account linked | 2pts | ✅ 2pts | — |
| Posted in last 14 days | 3pts | ✅ 3pts | Uses `postedLast14Days` boolean |
| Reels in last 30 days | 3pts | ⚠️ hasReels | SERP snippet may not surface reels reliably |
| Engagement above median | 4pts | ❌ 0pts | No borough benchmark — structurally deferred |
| TikTok account exists | 3pts | ✅ 3pts (when present) | — |

### Press (25pts)
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| Any coverage in 12 months | 5pts | ✅ 5pts | Computed from extracted `articleDates` filtered to last 12 months |
| 3+ articles in 12 months | 5pts | ✅ 5pts | Same — falls back to Claude count when no dates available |
| Tier 1 source | 5pts | ✅ 5pts | — |
| Positive sentiment | 5pts | ✅ 5pts | — |
| No negative in top 10 | 5pts | ✅ 5pts | — |

### UGC (10pts)
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| 10+ customer Instagram posts tagging location | 5pts | ✅ Implemented | Estimated by Claude from SERP — reasonable proxy |
| Any TikTok UGC mentions | 3pts | ❌ 0pts | V2 |
| Reddit/community mentions | 2pts | ❌ 0pts | V2 |

### Competitive Context (10pts)
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| Relative rank vs. local competitors | 10pts linear scale | ✅ Implemented | — |

---

## Known Limitations

### GBP Photo Count — Cannot Scrape
Google Maps photo counts are JS-rendered. Inferred from review count: ≥500 reviews → `reviews × 0.15` photos; ≥100 → `× 0.10`; <100 → 0.

### Instagram Direct Fetch — Meta Tags Past Truncation Limit
Falls back to SERP knowledge panel — currently working. Fix if SERP stops: increase `unlockUrl` truncation limit to 12,000 chars for Instagram URLs.

### Engagement Rate — No Borough Benchmark
The 4pt "engagement above borough median" signal requires a reference dataset. Always 0pts. Needs static lookup table or accumulated audit history.

---

## Implemented vs V2 Roadmap

### In MVP (shipped & verified on Vercel)
- [x] Input form: restaurant name + postcode
- [x] Full 8-step durable audit pipeline (Vercel Workflow SDK)
- [x] GBP audit via Bright Data SERP
- [x] Website scrape
- [x] Instagram audit — `postedLast14Days`, `customerInstagramPosts`, followers, reels
- [x] Press coverage — dual SERP, date-sorted, up to 100 results, per-article data with URLs extracted from SERP HTML
- [x] Coverage timeline chart — dynamic quarter range, paginated article list
- [x] 5 nearest competitor benchmarks
- [x] Score calculation (6 dimensions, 0–100)
- [x] Claude-generated narrative + 3 quick wins
- [x] Full dashboard UI — score dial, dimension bars, timeline, competitor table, quick wins
- [x] EventSource SSE streaming — live step progress
- [x] Structured outputs throughout — no `JSON.parse` fragility
- [x] Error handling — `FatalError`, `RetryableError`, retry logic for 429s
- [x] PDF download — `window.print()` + `@media print` CSS, verified working

### Deferred to V2
- [ ] TikTok audit
- [ ] TikTok + Reddit UGC (5pts combined)
- [ ] Engagement above borough median (4pts)
- [x] Compute press recency from dates (not Claude inference) — shipped
- [ ] Web Archive historical depth
- [ ] Weekly monitoring workflow
- [ ] White-label agency mode
- [ ] Bulk CSV upload
- [ ] Neon database persistence

---

## Pre-Submission Checklist

| # | Action | Status |
|---|--------|--------|
| 1 | All pipeline steps verified on Vercel prod | ✅ Done |
| 2 | PDF download verified | ✅ Done (window.print) |
| 3 | Run live Brat audit on prod, record real scores | ⬜ Do this |
| 4 | Update demo script to match real Brat numbers | ⬜ After #3 |
| 5 | Test graceful degradation (no Instagram / no website) | ⬜ Optional |
| 6 | Fix `anyCoverageIn12Months` to compute from dates | ✅ Done |
| 7 | Hackathon submission write-up | ⬜ Do this |
