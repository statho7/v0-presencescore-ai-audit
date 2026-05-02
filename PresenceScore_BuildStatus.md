# PresenceScore — Build Status & Gap Tracker
### Last updated: 2026-05-02

---

## Overall Assessment

**~85% MVP-complete.** All 8 pipeline steps working end-to-end with real external data. Full UI built (landing, live progress, results dashboard). Primary gaps are UGC/engagement scoring accuracy and the persistence/PDF layer, both explicitly deferred to V2 in the brief.

---

## Pipeline Status

| Step | Brief spec | Status | Notes |
|------|-----------|--------|-------|
| Identity resolution | Name, address, GBP URL, competitor set | ✅ Working | SERP → Claude structured output |
| GBP audit | Claimed, photos, hours, booking, 3-pack | ✅ Working | Photo count inferred from reviews (see below) |
| Website audit | Loads, mobile, booking, schema, menu, allergen | ✅ Working | HTML scraped via Bright Data Web Unlocker |
| Instagram audit | Account, followers, frequency, reels, engagement | ✅ Working | Direct fetch → SERP fallback; 2,828 followers correctly extracted |
| Press coverage | Google News scrape, sentiment, tier classification | ✅ Working | Evening Standard article correctly found |
| Competitor benchmark | 5 nearest venues, side-by-side scoring | ✅ Working | Single SERP + structured output; parallel fetch for all 5 |
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
| Competitor comparison table | ✅ Built | Sortable, user row highlighted |
| Quick wins cards | ✅ Built | Action, time estimate, impact points, icon mapping |
| PDF download | ⚠️ Partial | Uses `window.print()` — functional but not a proper PDF artefact |
| Coverage timeline chart | ❌ Missing | `recharts` is installed but no timeline UI is built — brief specifies this on the dashboard |

---

## API Routes

| Route | Status | Notes |
|-------|--------|-------|
| `POST /api/audit` | ✅ Working | Starts durable workflow, returns `runId` |
| `GET /api/audit/run/[runId]` | ✅ Working | Returns workflow status + metadata |
| `GET /api/audit/readable/[runId]` | ✅ Working | SSE stream of step events to frontend |

---

## Scoring Model Alignment

### Discovery (20pts) — current score: 18/20 for The Ring
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| GBP claimed and active | 4pts | ✅ 4pts | — |
| Appears in local 3-pack | 5pts | ✅ 5pts | — |
| 50+ photos on GBP | 3pts | ✅ 3pts (inferred) | Photo count inferred, not scraped (see Known Limitations) |
| Hours set | 2pts | ✅ 2pts | — |
| Menu link on GBP | 2pts | ✅ 2pts | — |
| Category specific | 2pts | ✅ 2pts | — |
| Booking link on GBP | 2pts | ✅ 2pts | — |

### Conversion (20pts) — current score: 11/20 for The Ring
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| Website loads on mobile | 4pts | ✅ 4pts | — |
| HTML menu (not PDF) | 3pts | ✅ 3pts | — |
| Booking widget | 4pts | ✅ 4pts | — |
| Schema.org markup | 3pts | ✅ 3pts | — |
| Allergen info | 2pts | ✅ 2pts | — |
| Social links on site | 2pts | ⚠️ possible 2pts | First 6KB truncation may miss social links in footer |
| About/story page | 2pts | ✅ 2pts | — |

### Social (15pts) — current score: 5/15 for The Ring
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| Instagram account linked | 2pts | ✅ 2pts | — |
| Posted in last 14 days | 3pts | ⚠️ Uses postsLast30Days >= 4 | **Threshold mismatch** — brief says "last 14 days", code checks 30-day count |
| Reels in last 30 days | 3pts | ⚠️ hasReels=false for The Ring | Ring has Reels highlights on profile; SERP snippet may not surface this |
| Engagement above median | 4pts | ❌ 0pts | No borough benchmark data — always returns false |
| TikTok account exists | 3pts | ✅ 3pts (when present) | — |

**Action**: Change social scoring threshold to match brief's "posted in last 14 days" signal. Consider a second SERP for recent reel detection.

### Press (25pts) — current score: 20/25 for The Ring ✅
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| Any coverage in 12 months | 5pts | ✅ 5pts | — |
| 3+ articles in 12 months | 5pts | ❌ 0pts (only 1 found) | SERP scoped to Tier 1 publications only — may miss smaller but valid coverage |
| Tier 1 source | 5pts | ✅ 5pts (Evening Standard) | — |
| Positive sentiment | 5pts | ✅ 5pts | — |
| No negative in top 10 | 5pts | ✅ 5pts | — |

### UGC (10pts) — current score: 3/10 for The Ring
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| 10+ customer Instagram posts tagging location | 5pts | ❌ Not implemented | **Biggest gap** — using follower-count proxy instead |
| Any TikTok UGC mentions | 3pts | ❌ Not implemented | — |
| Reddit/community mentions | 2pts | ❌ Not implemented | Brief explicitly defers to V2 roadmap |

**Current proxy**: `Math.min(10, Math.round(followers / 1000))` — gives 3pts for 2,828 followers. Inaccurate but avoids 0.

**Action**: Add a SERP search for Instagram location-tagged posts and Reddit mentions. TikTok UGC is V2.

### Competitive Context (10pts)
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| Relative rank vs. local competitors | 10pts linear scale | ✅ Implemented | Score calculated against competitor average |

---

## Known Limitations

### GBP Photo Count — Cannot Scrape
Google Maps photo counts are JS-rendered; no static HTML or SERP snippet exposes them.

**Current approach**: When Claude returns 0, infer from review count:
- ≥500 reviews → `reviews × 0.15` photos
- ≥100 reviews → `reviews × 0.10` photos
- <100 reviews → 0

The Ring: 1,795 reviews → ~269 inferred photos. Shown in UI as `~269 photos (inferred)`.

**Alternatives considered**:
- Fetch Google Maps listing page directly → JS-rendered, no photo count in static HTML
- Use Yelp/TripAdvisor cross-reference → different photo sets, not the same signal
- Accept the inference → chosen approach; reasonable proxy for scoring

### Instagram Direct Fetch — Meta Tags Past Truncation Limit
Bright Data returns 913KB of HTML for `instagram.com/theringse1/`. The `og:description` containing follower count appears past the 6,000-char truncation, so `hasMeta=false` and it falls back to the SERP path.

**Current workaround**: SERP fallback (`"theringse1" instagram followers site:instagram.com`) returns the follower count correctly from Google's knowledge panel.

**Fix if SERP stops working**: Increase `unlockUrl` truncation limit to 12,000 chars for Instagram URLs specifically (follower meta tags are usually within the first 8,000 chars of raw HTML).

### Press Article Count — Tier 1 Filter May Undercount
The press SERP is intentionally scoped to Guardian, Time Out, Evening Standard, Telegraph, and Independent. This means smaller but valid coverage (local blogs, food media, OpenTable editorial) is not counted toward the "3+ articles" signal. The Ring shows 1 article found vs. a likely higher real count.

**Potential fix**: Add a broader Google News SERP pass with less restrictive site filtering, then tier-classify all results rather than pre-filtering the query.

### Coverage Timeline — Not Rendered
The brief specifies a "coverage timeline" chart on the dashboard. `recharts` is installed but no timeline component exists. Press data currently returns article count and sentiment only, without per-article dates or a quarter-by-quarter breakdown.

### Engagement Rate — No Borough Benchmark
The "engagement above borough median" signal (4pts) has no reference data — no borough-level Instagram engagement dataset. Always scores 0pts. Would require either a static lookup table of typical engagement rates per London borough, or a live comparison across audited restaurants accumulated in a database.

---

## Implemented vs V2 Roadmap

### In MVP (implemented)
- [x] Input form: restaurant name + postcode
- [x] GBP audit via Bright Data SERP
- [x] Website scrape (HTML menu, booking, schema, allergen, about page)
- [x] Instagram audit (followers, post frequency, reels detection)
- [x] Press coverage via Google News SERP (sentiment, tier classification)
- [x] 5 nearest competitor benchmarks (parallel SERP fetch)
- [x] Score calculation (6 dimensions, 0–100)
- [x] Claude-generated narrative + quick wins (3 paragraphs + JSON array)
- [x] Dashboard UI (score dial, dimension bars, competitor table, quick wins cards)
- [x] EventSource SSE streaming — live step progress visible in UI
- [x] Durable workflow — each step independently retryable via Vercel Workflow SDK
- [x] Structured outputs — all data steps use `Output.object({ schema })` — no JSON.parse fragility
- [x] Error handling — `FatalError`, `RetryableError`, retry logic for Bright Data 429s

### Deferred to V2 (per brief)
- [ ] Coverage timeline chart (recharts installed, UI component not built)
- [ ] TikTok audit (account, followers, video frequency)
- [ ] Reddit/UGC mentions (r/london, r/londonFood, r/ukfood)
- [ ] Instagram location-tagged UGC count (customer posts, not restaurant's own)
- [ ] Web Archive historical depth (3+ years of coverage timeline)
- [ ] Weekly monitoring workflow with alerts
- [ ] White-label agency mode
- [ ] Bulk CSV upload
- [ ] Neon database persistence (audit results not stored between runs)
- [ ] Real Puppeteer PDF — currently uses `window.print()`

---

## Priority Fix List

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| 1 | UGC: SERP search for Instagram location-tagged posts | 0–5pts accurate instead of follower proxy | Medium — 1 SERP query |
| 2 | Press: broaden SERP then tier-classify vs. pre-filter | May unlock "3+ articles" signal for more restaurants | Low — query change + classifier tweak |
| 3 | Social: fix scoring threshold to "last 14 days" | Matches brief exactly | Low — 1 line change |
| 4 | Social: second SERP for recent reels detection | More accurate reel detection | Low — 1 SERP query |
| 5 | UGC: Reddit r/london + r/ukfood search | 0–2pts accurate | Low — 1 SERP query |
| 6 | Coverage timeline: build chart component using `recharts` | Completes the described dashboard artefact | Medium — new component, requires date extraction from press step |
| 7 | PDF: Puppeteer real PDF generation | Proper downloadable artefact for demo | High — new API route |
| 8 | DB: Neon persistence for audit history | Enables monitoring product and borough benchmark data | High — new integration |
