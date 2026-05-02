# PresenceScore — Product Brief
### AI-Powered Digital Presence Intelligence for London Restaurants

---

## The Problem

London's independent restaurant scene is one of the most competitive in the world — over 15,000 restaurants across 32 boroughs, many fighting for the same customer. The restaurants losing that fight aren't always losing on food quality. They're losing because they're invisible online.

The painful reality:

- A restaurant can have no idea their Google Business Profile hasn't been updated in 14 months
- They don't know their competitor 200 metres away has 60× more photos on Google
- They've never seen that a food blogger wrote a negative piece about them in 2023 that still ranks on page one
- They're posting on Instagram twice a month while competitors post daily Reels
- Their website has no schema markup, no booking widget, and loads in 8 seconds on mobile

No one has built a tool that tells an independent restaurant owner exactly where they stand — not just in isolation, but *relative to the restaurants they're actually competing with*, and not just from their own published signals, but from **what the world is saying about them**.

PR agencies charge £2,000–5,000/month to track this manually. Digital marketing agencies charge £1,500/month to manage it. Most independent London restaurants have neither the budget nor the time.

**PresenceScore changes that.**

---

## Vision

> *Give every independent London restaurant the same digital intelligence that only well-funded restaurant groups currently have access to — in 90 seconds, for free.*

PresenceScore is an AI agent that takes a restaurant name and postcode, runs a comprehensive multi-source audit across their owned channels and the broader web, scores their digital presence out of 100, benchmarks them against their 5 nearest competitors, and produces a prioritised action plan any owner can execute without a marketing agency.

---

## Business Goals

### Goal 1 — Demonstrate Real, Immediate Value
The tool must produce a result that makes a restaurant owner say *"I didn't know that"* within 90 seconds of submitting their name. The insight has to be specific and actionable, not generic ("improve your social media"). It must reference real data about their actual situation.

### Goal 2 — Create a Repeatable Revenue Model
The audit is free. Monitoring is paid. After seeing their score, restaurant owners can subscribe to weekly PresenceScore tracking — they get alerted when their score changes, when a new article is published about them, when a competitor's score overtakes theirs, or when a UGC post mentioning them goes viral.

Target price point: **£49/month per location**. A single additional cover per week more than justifies it.

### Goal 3 — B2B2B Distribution at Scale
The real growth lever is not selling to individual restaurants — it's selling to the organisations that serve them:

- **Restaurant associations** (London Independent Restaurants, UKHospitality) — bulk audits as a member benefit
- **Food PR agencies** — white-label the report as a client prospecting tool
- **Accountants and business advisors** serving hospitality — add PresenceScore to their onboarding pack
- **Commercial landlords** with restaurant tenants — offer it as a value-add service

At scale: **£199/month for agencies** covering up to 20 locations.

### Goal 4 — Win the Hackathon Technical Track
The build must demonstrate: durable multi-step agent execution, real external data sources (not static knowledge), human-readable AI-generated insight, and a tangible produced artefact. Every step of the agent should be observable and resumable, showcasing the Vercel Workflow SDK's core strengths.

---

## Target Users

### Primary — The Independent Restaurant Owner
- Solo operators or small groups (1–5 sites)
- Located in London, initially focused on inner boroughs (Hackney, Islington, Southwark, Tower Hamlets, Lambeth)
- Not technical; doesn't have a marketing team
- Motivated by: more covers, surviving against chains, getting press coverage
- Pain: doesn't know what to fix, doesn't have time to research it, can't afford an agency

### Secondary — The Food PR / Marketing Agency
- Manages 5–20 restaurant clients
- Currently does this research manually using a mix of Google, SEMrush, and intuition
- Wants a faster way to onboard new clients and show value in the first meeting
- Will pay for white-label or bulk access

### Tertiary — Restaurant Associations & Trade Bodies
- UKHospitality, London Independent Restaurants, Night Time Industries Association
- Want to offer members tangible tools, not just lobbying updates
- A free bulk-audit of all member restaurants is a compelling membership benefit

---

## What the App Does

### Input
The restaurant owner (or agent acting on their behalf) provides:
- Restaurant name
- London postcode OR Google Maps URL

That is all. The agent handles everything else.

---

### The Agent Pipeline

The PresenceScore agent runs as a durable, observable multi-step workflow. Each step is independently retryable and the full run is resumable if interrupted.

#### Step 1 — Identity Resolution
- Confirm the restaurant exists and resolve its canonical name, address, and Google Business Profile URL
- Detect if multiple locations exist (chain vs. independent)
- Establish the competitive set: find the 5 nearest restaurants of similar cuisine type and price band via SERP local pack

#### Step 2 — Owned Presence Audit

**Google Business Profile**
- Profile claimed vs. unclaimed
- Hours set and recently updated
- Photo count (Google's own data shows profiles with 100+ photos get 520% more calls)
- Menu link present
- Booking / order link present
- Website linked and resolving
- Q&A section populated
- Category specificity (generic "Restaurant" vs. "Korean BBQ" or "Natural Wine Bar")
- Local 3-pack appearance for their cuisine + postcode search query
- Position in local pack vs. the competitive set

**Website Audit**
- Website exists and loads
- Mobile responsive
- SSL certificate present
- Load speed proxy (page weight and render complexity)
- Menu present — and is it HTML (good for SEO) or PDF-only (bad)
- Allergen/dietary information present (legally required in UK under Natasha's Law)
- Online booking widget present (and which platform: OpenTable, Resy, SevenRooms)
- Online ordering links (Deliveroo, Uber Eats, Just Eat, own system)
- Social media links present and resolving
- Schema.org Restaurant markup present (used by Google for rich SERP results)
- About/story page present (important for press coverage)
- Press/media mentions page
- Gift vouchers, events, or private dining pages (revenue diversification signals)
- Last content update signals (copyright year, news section dates)

**Instagram Presence**
- Account exists and is linked from website/GBP
- Follower count
- Posting frequency — posts per week over last 30 days
- Reels vs. static posts ratio (Reels get 3× organic reach currently)
- Average engagement rate vs. borough benchmark
- Using location tags consistently
- Bio includes website link, address, and booking CTA
- Ghost account detection (last post more than 60 days ago)

**TikTok Presence**
- Account exists
- Follower count
- Video posting frequency
- Average view count per video
- Any viral outliers (videos with 10×+ average views)

#### Step 3 — Earned Presence Audit

**Web Mentions & Press Coverage**
- Google News search for restaurant name → extract all article URLs, dates, and source names
- Full content scrape of each article
- Claude classifies each article: sentiment (positive / neutral / negative), topic (food review / chef profile / health inspection / award / closure scare / event), and source quality tier (national press / specialist food media / local blog / aggregator)
- Build a coverage timeline: articles per quarter over the last 2 years
- Detect coverage gaps: when did coverage peak, has it declined?
- Flag any negative articles that still rank prominently in Google search results
- Identify what the restaurant is publicly *known* for vs. what their own channels suggest they want to be known for

**User-Generated Content (UGC) Volume**
- Instagram posts by *other people* tagging the restaurant (location tag search)
- TikTok posts mentioning or tagging the restaurant by non-restaurant accounts
- UGC volume is a strong proxy for organic word-of-mouth — more powerful than the restaurant's own posts

**Reddit & Community Mentions**
- Search r/london, r/londonFood, r/ukfood for restaurant name
- Classify sentiment and recency
- Flag any threads with high engagement (viral word-of-mouth, positive or negative)

#### Step 4 — Competitive Benchmarking
For each of the 5 nearest competitors identified in Step 1:
- Run the same GBP and web signals audit (lightweight version)
- Score them on the same framework
- Produce a side-by-side comparison table

Output: *"You rank 4th out of 6 similar restaurants within 0.5 miles on digital presence. The top performer is [X] — their key advantages are 3× your photo count on Google and a TripAdvisor ranking of #12 in Hackney vs. your #67."*

#### Step 5 — Score Generation & Insight Synthesis
Claude synthesises all collected data into:

**The PresenceScore (0–100)**

| Dimension | Weight | What It Measures |
|---|---|---|
| Owned — Discovery | 20pts | GBP completeness, local pack position |
| Owned — Conversion | 20pts | Website quality, booking, menu, schema |
| Owned — Social | 15pts | Instagram/TikTok activity and engagement |
| Earned — Press | 25pts | Article volume, recency, sentiment, source quality |
| Earned — UGC | 10pts | Customer-generated mentions and tags |
| Competitive Context | 10pts | Relative rank vs. local competitors |

**The Quick Wins List**
Ranked by impact-vs-effort, the top 5 specific actions the restaurant should take:
- Each action references their actual missing data (not generic advice)
- Each action includes a time estimate ("30 minutes to fix")
- Each action references what a top competitor is doing differently

**The Narrative Summary**
A 3-paragraph plain-English summary a non-technical owner can read in 60 seconds:
- What they're doing well
- Their biggest vulnerability
- The single most important thing to fix first

---

### Output Artefacts

1. **The PresenceScore Dashboard** — interactive web UI showing the score dial, dimension breakdown, competitor comparison chart, and coverage timeline
2. **The PDF Report** — downloadable, shareable, brandable one-pager the owner can show their team or a marketing agency
3. **The Quick Wins Checklist** — a simple task list they can actually act on this week

---

## Scoring Model — Detail

### Owned — Discovery (20pts)
| Signal | Points |
|---|---|
| GBP claimed and active | 4 |
| Appears in local 3-pack for primary cuisine search | 5 |
| 50+ photos on GBP | 3 |
| Hours set and current | 2 |
| Menu link on GBP | 2 |
| Category specific (not just "Restaurant") | 2 |
| Booking link on GBP | 2 |

### Owned — Conversion (20pts)
| Signal | Points |
|---|---|
| Website exists and loads on mobile | 4 |
| HTML menu with prices (not PDF) | 3 |
| Online booking widget present | 4 |
| Schema.org Restaurant markup | 3 |
| Allergen info present | 2 |
| Social links present and active | 2 |
| About/story page present | 2 |

### Owned — Social (15pts)
| Signal | Points |
|---|---|
| Instagram account linked | 2 |
| Posted in last 14 days | 3 |
| Reels in last 30 days | 3 |
| Engagement rate above borough median | 4 |
| TikTok account exists | 3 |

### Earned — Press (25pts)
| Signal | Points |
|---|---|
| Any press coverage in last 12 months | 5 |
| 3+ articles in last 12 months | 5 |
| Coverage from Tier 1 source (national/specialist) | 5 |
| Predominantly positive sentiment | 5 |
| No prominent negative articles in top 10 Google results | 5 |

### Earned — UGC (10pts)
| Signal | Points |
|---|---|
| 10+ customer Instagram posts tagging location | 5 |
| Any TikTok UGC mentions | 3 |
| Reddit/community mentions present | 2 |

### Competitive Context (10pts)
Relative rank in local competitive set — top performer gets 10pts, bottom gets 0pts, linear scale between.

---

## What We Are NOT Building

To be explicit about scope and avoid feature creep:

- **Not a review aggregator.** We do not display, store, or resell Google review text. We track metadata signals only (response rate, photo count, etc.).
- **Not a social media management tool.** We audit and score. We do not schedule posts, suggest captions, or manage accounts.
- **Not a booking platform.** We detect whether booking exists and recommend a provider; we do not integrate with booking systems.
- **Not a replacement for a PR agency.** We surface insights. Relationships, pitching, and placements are human work.
- **Not a general-purpose SEO tool.** We are vertical-specific to London restaurants and intentionally so.

---

## Tech Stack (Hackathon Build)

| Layer | Tool | Why |
|---|---|---|
| Agent orchestration | Vercel Workflow SDK + DurableAgent | Multi-step, retryable, observable pipeline |
| Data layer | Bright Data MCP | SERP, website scraping, Instagram/TikTok structured extraction |
| AI reasoning | Claude Sonnet (via Anthropic API) | Sentiment analysis, insight synthesis, score narrative |
| Frontend | v0 | Dashboard UI generated from prompt |
| Database | Neon (via MCP) | Store audit results, competitor data, coverage history |
| PDF generation | Puppeteer / html-pdf | The downloadable report artefact |
| Delivery | Vercel | Deployment |

---

## Hackathon MVP Scope (8 Hours)

### Build
- Input form: restaurant name + postcode
- Step 1: GBP data via Bright Data SERP (claimed, photos, hours, booking, 3-pack position)
- Step 2: Website scrape (exists, mobile, booking widget, social links, schema)
- Step 3: Instagram audit via Bright Data MCP (account, followers, frequency, engagement)
- Step 4: Google News scrape → Claude sentiment + coverage timeline (last 12 months)
- Step 5: 5 nearest competitor GBP scores via SERP
- Step 6: Score calculation + Claude-generated quick wins + narrative
- Step 7: Dashboard UI (score dial, dimension bars, competitor chart, coverage timeline)
- Step 8: PDF report download

### Describe / Mock in Pitch (V2 Roadmap)
- TikTok audit
- Reddit/UGC mentions
- Web Archive historical depth (3+ years)
- Weekly monitoring workflow with alerts
- White-label agency mode
- Bulk upload (CSV of restaurant names)

---

## The Demo Script

*"I'm going to audit a real London restaurant right now. I'll type in a name and a postcode. Watch the agent run."*

Agent runs live. Each step appears in the workflow dashboard. 90 seconds later:

*"Brat in Shoreditch scores 71 out of 100. Their earned presence is exceptional — 14 press mentions in the last 12 months, 93% positive, covered by The Guardian and Time Out. But their owned presence has gaps: their GBP has only 23 photos, no booking link, and their website has no schema markup. Their nearest competitor Smoking Goat scores 58 overall — weaker press, but stronger GBP signals.*

*Here are their top 3 quick wins: add 40 photos to Google — takes an afternoon, estimated impact +6 points. Add an OpenTable widget to their website — 2 hours with a developer, +4 points. Fix their Instagram posting cadence — they've been dark for 6 weeks."*

*Then we hit download — and they get this PDF.*

That is the pitch. That is the demo. That is the product.

---

## Success Metrics (Post-Hackathon)

| Metric | 30-day target | 90-day target |
|---|---|---|
| Audits run | 500 | 5,000 |
| Email captures (free audit → monitor signup funnel) | 200 | 1,500 |
| Paid monitoring subscribers | 10 | 100 |
| Agency/association pilots | 1 | 5 |
| Press mentions of PresenceScore itself | 2 | 10 |

---

*Built for the Vercel Hackathon, London · May 2026*
*Stack: Vercel Workflow SDK · Bright Data MCP · Claude Sonnet · v0 · Neon*
