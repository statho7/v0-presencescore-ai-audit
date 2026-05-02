# PresenceScore — Build Status & Gap Tracker
### Last updated: 2026-05-02

---

## Pipeline Status

| Step | Brief spec | Status | Notes |
|------|-----------|--------|-------|
| Identity resolution | Name, address, GBP URL, competitor set | ✅ Working | SERP → Claude structured output |
| GBP audit | Claimed, photos, hours, booking, 3-pack | ✅ Working | Photo count inferred from reviews (see below) |
| Website audit | Loads, mobile, booking, schema, menu, allergen | ✅ Working | HTML scraped via Bright Data Web Unlocker |
| Instagram audit | Account, followers, frequency, reels, engagement | ✅ Working | Direct fetch → SERP fallback; 2,828 followers correctly extracted |
| Press coverage | Google News scrape, sentiment, tier classification | ✅ Working | Evening Standard article correctly found |
| Competitor benchmark | 5 nearest venues, side-by-side scoring | ✅ Working | Single SERP + structured output |
| Score calculation | 6 dimensions, 0–100 | ✅ Working | Matches brief's weighting exactly |
| Narrative + quick wins | 3 paragraphs + top 3 actions | ✅ Working | Claude-generated, no parse errors |

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
| Social links on site | 2pts | ⚠️ 2pts | Site has no social links in first 6KB — truncation may miss them |
| About/story page | 2pts | ✅ 2pts | — |

### Social (15pts) — current score: 5/15 for The Ring
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| Instagram account linked | 2pts | ✅ 2pts | — |
| Posted in last 14 days | 3pts | ⚠️ Using postsLast30Days >= 4 | **Threshold mismatch** — brief says "last 14 days", code checks 30-day count |
| Reels in last 30 days | 3pts | ⚠️ hasReels=false for The Ring | Ring has Reels highlights on profile; SERP snippet may not surface this |
| Engagement above median | 4pts | ❌ 0pts | No borough benchmark data — always returns false |
| TikTok account exists | 3pts | ✅ 3pts (when present) | — |

**Action**: Change social scoring threshold to match brief's "posted in last 14 days" signal. Consider a second SERP for recent reel detection.

### Press (25pts) — current score: 20/25 for The Ring ✅
| Signal | Brief | Implemented | Gap |
|--------|-------|-------------|-----|
| Any coverage in 12 months | 5pts | ✅ 5pts | — |
| 3+ articles in 12 months | 5pts | ❌ 0pts (only 1 found) | — |
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
| Relative rank vs. local competitors | 10pts linear scale | ✅ Implemented | Score is calculated against competitor average |

---

## Known Limitations

### GBP Photo Count — Cannot Scrape
Google Maps photo counts are rendered by JavaScript and not present in any static HTML or SERP snippet. `site:google.com/maps` queries return a blocked/near-empty response.

**Current approach**: When Claude returns 0 (can't find it), infer from review count:
- ≥500 reviews → `reviews × 0.15` photos
- ≥100 reviews → `reviews × 0.10` photos
- <100 reviews → 0

The Ring: 1,795 reviews → 269 inferred photos. Shown in UI as `~269 photos (inferred)`.

**Alternatives considered**:
- Fetch Google Maps listing page directly → JS-rendered, no photo count in static HTML
- Use Yelp/TripAdvisor cross-reference → different photo sets, not the same signal
- Accept the inference → chosen approach; reasonable proxy for scoring

### Instagram Direct Fetch — Meta Tags Past Truncation Limit
Bright Data returns 913KB of HTML for `instagram.com/theringse1/`. The `og:description` containing follower count appears past the 6,000-char truncation. The direct fetch `hasMeta=false` so it falls back to the SERP path.

**Current workaround**: SERP fallback (`"theringse1" instagram followers site:instagram.com`) returns the follower count correctly from Google's knowledge panel.

**Fix if SERP stops working**: Increase `unlockUrl` truncation limit to 12,000 chars for Instagram URLs specifically (the meta tags are usually within the first 8,000 chars of raw HTML).

---

## Implemented vs V2 Roadmap

### In MVP (implemented)
- [x] Input form: restaurant name + postcode
- [x] GBP audit via Bright Data SERP
- [x] Website scrape
- [x] Instagram audit (followers, post frequency)
- [x] Press coverage via Google News SERP
- [x] 5 nearest competitor benchmarks
- [x] Score calculation (6 dimensions)
- [x] Claude-generated narrative + quick wins
- [x] Dashboard UI (score dial, dimension bars, competitor table, quick wins)
- [x] Structured outputs — all data steps use `Output.object({ schema })` — no JSON.parse fragility

### Deferred to V2 (per brief)
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
| 1 | UGC: search for Instagram location-tagged posts | Scores 0–5pts accurately instead of proxy | Medium — 1 SERP query |
| 2 | UGC: Reddit r/london + r/ukfood search | Scores 0–2pts accurately | Low — 1 SERP query |
| 3 | Social: fix scoring threshold to "last 14 days" | Matches brief exactly | Low — 1 line change |
| 4 | Social: second SERP for recent reels detection | More accurate reel detection | Low — 1 SERP query |
| 5 | PDF: Puppeteer real PDF generation | Proper downloadable artefact | High — new API route |
| 6 | DB: Neon persistence for audit history | Enables monitoring product | High — new integration |
