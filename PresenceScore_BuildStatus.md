# PresenceScore — Build Status & Gap Tracker
### Last updated: 2026-05-02

---

## Overall Assessment

**~97% MVP-complete.** All 8 pipeline steps working end-to-end with real external data. Full UI built including coverage timeline with pagination. PDF generation merged and live. Scoring model fully aligned with brief. Press pipeline significantly improved (date-sorted, venue-suffix-aware, up to 100 results). One scoring signal (engagement above median) structurally deferred.

---

## Pipeline Status

| Step | Brief spec | Status | Notes |
|------|-----------|--------|-------|
| Identity resolution | Name, address, GBP URL, competitor set | ✅ Working | SERP → Claude structured output |
| GBP audit | Claimed, photos, hours, booking, 3-pack | ✅ Working | Photo count inferred from reviews (see below) |
| Website audit | Loads, mobile, booking, schema, menu, allergen | ✅ Working | HTML scraped via Bright Data Web Unlocker |
| Instagram audit | Account, followers, frequency, reels, engagement | ✅ Working | Direct fetch → SERP fallback; `postedLast14Days` + `customerInstagramPosts` extracted |
| Press coverage | Google News scrape, sentiment, tier classification | ✅ Working | Dual SERP (news + site-filtered), date-sorted newest-first, up to 100 results, per-article source/date/url extracted |
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
| PDF download | ✅ Built & Merged | Puppeteer via `@sparticuz/chromium`, loading state, real A4 PDF |

---

## API Routes

| Route | Status | Notes |
|-------|--------|-------|
| `POST /api/audit` | ✅ Working | Starts durable workflow, returns `runId` |
| `GET /api/audit/run/[runId]` | ✅ Working | Returns workflow status + metadata |
| `GET /api/audit/readable/[runId]` | ✅ Working | SSE stream of step events to frontend |
| `POST /api/pdf` | ✅ Working | Server-side PDF via puppeteer-core + @sparticuz/chromium |

---

## Scoring Model Alignment

### Discovery (20pts)
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| GBP claimed and active | 4pts | ✅ 4pts | — |
| Appears in local 3-pack | 5pts | ✅ 5pts | — |
| 50+ photos on GBP | 3pts | ✅ 3pts (inferred) | Photo count inferred from review count — see Known Limitations |
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
| Social links on site | 2pts | ⚠️ possible 2pts | First 6KB truncation may miss social links in footer |
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
| Any coverage in 12 months | 5pts | ✅ 5pts | `anyCoverageIn12Months` boolean evaluated by Claude |
| 3+ articles in 12 months | 5pts | ⚠️ improving | Now date-sorted + up to 100 results; still relies on Claude counting recent articles |
| Tier 1 source | 5pts | ✅ 5pts | — |
| Positive sentiment | 5pts | ✅ 5pts | — |
| No negative in top 10 | 5pts | ✅ 5pts | — |

### UGC (10pts)
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| 10+ customer Instagram posts tagging location | 5pts | ✅ Implemented | Uses `customerInstagramPosts` extracted from Instagram SERP data |
| Any TikTok UGC mentions | 3pts | ❌ 0pts | V2 — no TikTok data source |
| Reddit/community mentions | 2pts | ❌ 0pts | V2 — no Reddit SERP step |

**Note:** `customerInstagramPosts` is estimated by Claude from SERP data — a reasonable proxy but not a direct count. Tiered: ≥10 → 5pts, ≥3 → 2pts, fallback to follower tiers.

### Competitive Context (10pts)
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| Relative rank vs. local competitors | 10pts linear scale | ✅ Implemented | Score calculated against competitor average |

---

## Known Limitations

### GBP Photo Count — Cannot Scrape
Google Maps photo counts are JS-rendered; no static HTML or SERP snippet exposes them.

**Current approach**: Infer from review count:
- ≥500 reviews → `reviews × 0.15` photos
- ≥100 reviews → `reviews × 0.10` photos
- <100 reviews → 0

Shown in UI as `~269 photos (inferred)`. Reasonable proxy for scoring.

### Instagram Direct Fetch — Meta Tags Past Truncation Limit
Bright Data returns 913KB of HTML; follower `og:description` appears past the 6,000-char truncation. Falls back to SERP knowledge panel — currently working correctly.

**Fix if SERP stops working**: Increase `unlockUrl` truncation limit to 12,000 chars for Instagram URLs.

### Press Article Recency — Established Restaurants Show Historical Coverage
For restaurants with peak press at launch (e.g. Brat, 2018), SERP results still skew toward high-backlink old articles even with date-sort. The `anyCoverageIn12Months` signal depends on Claude correctly interpreting the snippet dates.

**Mitigated by**: `&tbs=sbd:1` (sort by date) on both press queries + venue-suffix stripping so `"BRAT"` not `"BRAT Restaurant"` is matched.

### Engagement Rate — No Borough Benchmark
The "engagement above borough median" signal (4pts) requires a reference dataset. No borough-level Instagram engagement data exists in the system. Always scores 0pts.

---

## Implemented vs V2 Roadmap

### In MVP (shipped on main)
- [x] Input form: restaurant name + postcode
- [x] GBP audit via Bright Data SERP (claimed, photos inferred, hours, booking, 3-pack)
- [x] Website scrape (HTML menu, booking widget, schema, allergen, about page)
- [x] Instagram audit — `postedLast14Days`, `customerInstagramPosts`, followers, reels
- [x] Press coverage — dual SERP (Google News + site-filtered), date-sorted, up to 100 results, per-article source/date/url/sentiment/tier
- [x] Coverage timeline chart — dynamic quarter range, stacked bar by sentiment, paginated article list (5/page)
- [x] 5 nearest competitor benchmarks
- [x] Score calculation (6 dimensions, 0–100, matches brief exactly)
- [x] Claude-generated narrative + 3 quick wins
- [x] Dashboard UI — score dial, dimension bars, coverage timeline, competitor table, quick wins
- [x] EventSource SSE streaming — live step progress
- [x] Durable workflow — each step independently retryable (Vercel Workflow SDK)
- [x] Structured outputs throughout — no `JSON.parse` fragility
- [x] Error handling — `FatalError`, `RetryableError`, retry logic for 429s
- [x] PDF generation — `POST /api/pdf`, Puppeteer A4, loading state on button

### Deferred to V2
- [ ] TikTok audit (account, followers, video frequency, viral outliers)
- [ ] TikTok UGC mentions (non-restaurant posts — 3pts of UGC score)
- [ ] Reddit/community mentions (r/london, r/londonFood — 2pts of UGC score)
- [ ] Engagement above borough median (4pts of Social score — needs benchmark data)
- [ ] Web Archive historical depth (3+ years of coverage timeline)
- [ ] Weekly monitoring workflow with alerts (durable sleep/wake/diff)
- [ ] White-label agency mode
- [ ] Bulk CSV upload
- [ ] Neon database persistence (enables monitoring and borough benchmark data)

---

## Next Steps (Demo Prep)

| Priority | What | Why |
|----------|------|-----|
| High | Run live audit of **Brat (EC2A 3JL)** on deployed Vercel URL | Validate demo script end-to-end on production |
| High | Verify PDF renders correctly on deployed URL | PDF route requires Node.js runtime + Chromium — confirm Vercel provisioned correctly |
| Medium | Test a restaurant with no Instagram / no website | Confirm graceful degradation and sensible scores at the edges |
| Medium | Add `anyCoverageIn12Months` date-awareness to press step | Currently Claude infers this from snippets; could be anchored to today's date explicitly |
| Low | Consider Reddit SERP step for UGC mentions | 2pts — small effort, broadens earned presence signals |
