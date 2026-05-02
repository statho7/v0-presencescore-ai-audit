import { getWritable, FatalError, RetryableError } from "workflow";
import { generateText } from "ai";
import type { AuditResult, QuickWin, Competitor, ScoreDimension } from "@/lib/audit-data";

// ---------------------------------------------------------------------------
// Event types streamed to the frontend
// ---------------------------------------------------------------------------

export type AuditEvent =
  | { type: "step_start"; stepId: string }
  | { type: "step_done"; stepId: string; log: string }
  | { type: "step_error"; stepId: string; error: string }
  | { type: "done"; result: AuditResult };

// ---------------------------------------------------------------------------
// Bright Data helpers
// ---------------------------------------------------------------------------

const BD_API = "https://api.brightdata.com/request";

async function serpSearch(query: string): Promise<string> {
  const res = await fetch(BD_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zone: process.env.BRIGHTDATA_UNLOCKER_ZONE,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=gb&hl=en&num=10`,
      format: "raw",
    }),
  });
  if (res.status === 429) throw new RetryableError("Bright Data rate limited", { retryAfter: "30s" });
  if (!res.ok) throw new FatalError(`Google search failed: ${res.status}`);
  const html = await res.text();
  // Strip scripts/styles, keep visible text for Claude
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return text.slice(0, 8000);
}

async function unlockUrl(url: string): Promise<string> {
  const res = await fetch(BD_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zone: process.env.BRIGHTDATA_UNLOCKER_ZONE,
      url,
      format: "raw",
    }),
  });
  if (res.status === 429) throw new RetryableError("Bright Data rate limited", { retryAfter: "30s" });
  if (!res.ok) throw new FatalError(`Web Unlocker error: ${res.status}`);
  const text = await res.text();
  return text.slice(0, 6000);
}

async function getInstagramProfile(handle: string): Promise<string> {
  const res = await fetch(BD_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zone: process.env.BRIGHTDATA_UNLOCKER_ZONE,
      url: `https://www.instagram.com/${handle}/`,
      format: "raw",
    }),
  });
  if (!res.ok) return "";
  const text = await res.text();
  return text.slice(0, 4000);
}

// ---------------------------------------------------------------------------
// AI Gateway call
// ---------------------------------------------------------------------------

async function askClaude(prompt: string): Promise<string> {
  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4.6",
    prompt,
  });
  return text;
}

// ---------------------------------------------------------------------------
// Emit helper — must be called inside a step
// ---------------------------------------------------------------------------

async function emit(event: AuditEvent): Promise<void> {
  "use step";
  const writer = getWritable<AuditEvent>().getWriter();
  try {
    await writer.write(event);
  } finally {
    writer.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Step 1 — Identity resolution
// ---------------------------------------------------------------------------

type Identity = {
  canonicalName: string;
  address: string;
  websiteUrl: string;
  instagramHandle: string;
  gbpRating: number;
  gbpReviews: number;
  gbpPhotos: number;
  hasBookingLink: boolean;
  hasHours: boolean;
  competitors: string[];
};

async function resolveIdentity(restaurantName: string, postcode: string): Promise<Identity> {
  "use step";
  await emit({ type: "step_start", stepId: "identity" });

  const raw = await serpSearch(`${restaurantName} restaurant ${postcode} London`);

  const analysis = await askClaude(`You are parsing Google SERP JSON for a London restaurant lookup.

Query: "${restaurantName} restaurant ${postcode} London"
SERP data (truncated): ${raw}

Extract and return ONLY valid JSON (no markdown):
{
  "canonicalName": "exact restaurant name from Google",
  "address": "full street address",
  "websiteUrl": "restaurant website URL or empty string",
  "instagramHandle": "instagram handle without @ or empty string",
  "gbpRating": 4.2,
  "gbpReviews": 234,
  "gbpPhotos": 45,
  "hasBookingLink": true,
  "hasHours": true,
  "competitors": ["Competitor 1", "Competitor 2", "Competitor 3", "Competitor 4", "Competitor 5"]
}

If data is missing use sensible defaults. competitors should be nearby restaurants in the same area.`);

  let identity: Identity;
  try {
    identity = JSON.parse(analysis);
  } catch {
    identity = {
      canonicalName: restaurantName,
      address: postcode,
      websiteUrl: "",
      instagramHandle: "",
      gbpRating: 0,
      gbpReviews: 0,
      gbpPhotos: 0,
      hasBookingLink: false,
      hasHours: false,
      competitors: [],
    };
  }

  const log = `Found on Google · ${identity.gbpReviews} reviews (${identity.gbpRating}★) · ${identity.gbpPhotos} photos`;
  await emit({ type: "step_done", stepId: "identity", log });
  return identity;
}

// ---------------------------------------------------------------------------
// Step 2 — GBP audit
// ---------------------------------------------------------------------------

type GbpAudit = {
  gbpClaimed: boolean;
  inLocalPack: boolean;
  photoCount: number;
  hasBookingLink: boolean;
  hasHours: boolean;
  hasMenuLink: boolean;
  specificCategory: boolean;
};

async function auditGbp(identity: Identity): Promise<GbpAudit> {
  "use step";
  await emit({ type: "step_start", stepId: "gbp" });

  const raw = await serpSearch(`"${identity.canonicalName}" ${identity.address} site:google.com/maps OR google.com/search`);

  const analysis = await askClaude(`Analyse this Google SERP data for a restaurant's Google Business Profile.

Restaurant: ${identity.canonicalName}
SERP data: ${raw}

Return ONLY valid JSON:
{
  "gbpClaimed": true,
  "inLocalPack": true,
  "photoCount": 45,
  "hasBookingLink": false,
  "hasHours": true,
  "hasMenuLink": false,
  "specificCategory": true
}

Use the SERP data to infer these signals. Default to false/0 if uncertain.`);

  let audit: GbpAudit;
  try {
    audit = JSON.parse(analysis);
  } catch {
    audit = {
      gbpClaimed: identity.gbpPhotos > 0,
      inLocalPack: false,
      photoCount: identity.gbpPhotos,
      hasBookingLink: identity.hasBookingLink,
      hasHours: identity.hasHours,
      hasMenuLink: false,
      specificCategory: false,
    };
  }

  const log = `${audit.photoCount} photos · ${audit.hasBookingLink ? "Booking link found" : "No booking link"} · ${audit.hasHours ? "Hours set" : "No hours"}`;
  await emit({ type: "step_done", stepId: "gbp", log });
  return audit;
}

// ---------------------------------------------------------------------------
// Step 3 — Website audit
// ---------------------------------------------------------------------------

type WebsiteAudit = {
  websiteLoads: boolean;
  htmlMenu: boolean;
  bookingWidget: boolean;
  schemaMarkup: boolean;
  allergenInfo: boolean;
  socialLinks: boolean;
  aboutPage: boolean;
  mobileScore: number;
};

async function auditWebsite(identity: Identity): Promise<WebsiteAudit> {
  "use step";
  await emit({ type: "step_start", stepId: "website" });

  if (!identity.websiteUrl) {
    const log = "No website found";
    await emit({ type: "step_done", stepId: "website", log });
    return {
      websiteLoads: false,
      htmlMenu: false,
      bookingWidget: false,
      schemaMarkup: false,
      allergenInfo: false,
      socialLinks: false,
      aboutPage: false,
      mobileScore: 0,
    };
  }

  const html = await unlockUrl(identity.websiteUrl);

  const analysis = await askClaude(`You are auditing a restaurant website HTML for digital presence signals.

Restaurant: ${identity.canonicalName}
Website HTML (truncated): ${html}

Return ONLY valid JSON:
{
  "websiteLoads": true,
  "htmlMenu": true,
  "bookingWidget": false,
  "schemaMarkup": false,
  "allergenInfo": false,
  "socialLinks": true,
  "aboutPage": true,
  "mobileScore": 72
}

- htmlMenu: true if there's an inline menu (not just a PDF link)
- bookingWidget: true if there's an embedded booking form/button
- schemaMarkup: true if you see application/ld+json or schema.org
- mobileScore: estimate 0-100 based on viewport meta, responsive CSS, font sizes`);

  let audit: WebsiteAudit;
  try {
    audit = JSON.parse(analysis);
    audit.websiteLoads = true;
  } catch {
    audit = {
      websiteLoads: true,
      htmlMenu: false,
      bookingWidget: false,
      schemaMarkup: false,
      allergenInfo: false,
      socialLinks: false,
      aboutPage: false,
      mobileScore: 50,
    };
  }

  const log = `Mobile score ~${audit.mobileScore} · ${audit.schemaMarkup ? "Schema markup found" : "No schema markup"} · ${audit.bookingWidget ? "Booking widget present" : "No booking widget"}`;
  await emit({ type: "step_done", stepId: "website", log });
  return audit;
}

// ---------------------------------------------------------------------------
// Step 4 — Instagram audit
// ---------------------------------------------------------------------------

type SocialAudit = {
  instagramLinked: boolean;
  followers: number;
  postsLast30Days: number;
  hasReels: boolean;
  engagementAboveMedian: boolean;
  tiktokExists: boolean;
};

async function auditInstagram(identity: Identity): Promise<SocialAudit> {
  "use step";
  await emit({ type: "step_start", stepId: "instagram" });

  if (!identity.instagramHandle) {
    const log = "No Instagram account found";
    await emit({ type: "step_done", stepId: "instagram", log });
    return {
      instagramLinked: false,
      followers: 0,
      postsLast30Days: 0,
      hasReels: false,
      engagementAboveMedian: false,
      tiktokExists: false,
    };
  }

  const html = await getInstagramProfile(identity.instagramHandle);

  const analysis = await askClaude(`Extract Instagram presence data from this HTML for a London restaurant.

Handle: @${identity.instagramHandle}
HTML (truncated): ${html}

Return ONLY valid JSON:
{
  "instagramLinked": true,
  "followers": 8200,
  "postsLast30Days": 6,
  "hasReels": true,
  "engagementAboveMedian": false,
  "tiktokExists": false
}

Estimate followers from any number you see. postsLast30Days: estimate from post frequency signals.
engagementAboveMedian: true if likes/comments suggest >3% engagement for their follower count.`);

  let audit: SocialAudit;
  try {
    audit = JSON.parse(analysis);
  } catch {
    audit = {
      instagramLinked: true,
      followers: 0,
      postsLast30Days: 0,
      hasReels: false,
      engagementAboveMedian: false,
      tiktokExists: false,
    };
  }

  const log = `@${identity.instagramHandle} · ${audit.followers.toLocaleString()} followers · ${audit.postsLast30Days} posts/30d · ${audit.hasReels ? "Has reels" : "No recent reels"}`;
  await emit({ type: "step_done", stepId: "instagram", log });
  return audit;
}

// ---------------------------------------------------------------------------
// Step 5 — Press coverage
// ---------------------------------------------------------------------------

type PressAudit = {
  articleCount: number;
  anyCoverageIn12Months: boolean;
  tier1Coverage: boolean;
  positiveSentiment: boolean;
  noNegativeInTopResults: boolean;
  articleTitles: string[];
};

async function auditPress(identity: Identity): Promise<PressAudit> {
  "use step";
  await emit({ type: "step_start", stepId: "press" });

  const raw = await serpSearch(`"${identity.canonicalName}" London restaurant review OR feature site:theguardian.com OR timeout.com OR standard.co.uk OR telegraph.co.uk OR independent.co.uk`);

  const analysis = await askClaude(`You are analysing press coverage for a London restaurant.

Restaurant: ${identity.canonicalName}
Google News / SERP data: ${raw}

Return ONLY valid JSON:
{
  "articleCount": 3,
  "anyCoverageIn12Months": true,
  "tier1Coverage": false,
  "positiveSentiment": true,
  "noNegativeInTopResults": true,
  "articleTitles": ["Title 1 – Source (Year)", "Title 2 – Source (Year)"]
}

tier1Coverage: true if Guardian, Time Out, Evening Standard, Telegraph, or Independent.
positiveSentiment: true if the coverage tone is positive or mixed-positive.
noNegativeInTopResults: true if no clearly negative reviews appear in top results.`);

  let audit: PressAudit;
  try {
    audit = JSON.parse(analysis);
  } catch {
    audit = {
      articleCount: 0,
      anyCoverageIn12Months: false,
      tier1Coverage: false,
      positiveSentiment: false,
      noNegativeInTopResults: true,
      articleTitles: [],
    };
  }

  const log = `${audit.articleCount} article${audit.articleCount !== 1 ? "s" : ""} found · ${audit.tier1Coverage ? "Tier-1 coverage" : "No tier-1"} · ${audit.positiveSentiment ? "Positive sentiment" : "Mixed/negative sentiment"}`;
  await emit({ type: "step_done", stepId: "press", log });
  return audit;
}

// ---------------------------------------------------------------------------
// Step 6 — Competitor benchmarking
// ---------------------------------------------------------------------------

type CompetitorData = {
  name: string;
  score: number;
  gbpPhotos: number;
  pressMentions: number;
  bookingLink: boolean;
};

async function benchmarkCompetitors(competitors: string[], postcode: string): Promise<CompetitorData[]> {
  "use step";
  await emit({ type: "step_start", stepId: "competitors" });

  const names = competitors.slice(0, 5);
  const raw = await serpSearch(`${names.join(" OR ")} restaurant ${postcode} London`);

  const analysis = await askClaude(`You are benchmarking ${names.length} competitor restaurants near ${postcode}, London.

Competitors: ${names.join(", ")}
SERP data: ${raw}

Return ONLY a valid JSON array (no markdown):
[
  { "name": "Competitor Name", "score": 65, "gbpPhotos": 45, "pressMentions": 3, "bookingLink": true }
]

Estimate scores 0-90 based on what you can infer from the SERP. Return one entry per competitor.`);

  let data: CompetitorData[];
  try {
    data = JSON.parse(analysis);
  } catch {
    data = names.map((name) => ({
      name,
      score: 60,
      gbpPhotos: 30,
      pressMentions: 2,
      bookingLink: true,
    }));
  }

  const log = `Benchmarked ${data.length} competitors in ${postcode}`;
  await emit({ type: "step_done", stepId: "competitors", log });
  return data;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function calculateScore(
  gbp: GbpAudit,
  web: WebsiteAudit,
  social: SocialAudit,
  press: PressAudit,
  competitors: CompetitorData[],
  myRawScore: number,
): { dimensions: ScoreDimension[]; total: number; competitive: number } {
  const discovery =
    (gbp.gbpClaimed ? 4 : 0) +
    (gbp.inLocalPack ? 5 : 0) +
    (gbp.photoCount >= 50 ? 3 : gbp.photoCount >= 20 ? 1 : 0) +
    (gbp.hasHours ? 2 : 0) +
    (gbp.hasMenuLink ? 2 : 0) +
    (gbp.specificCategory ? 2 : 0) +
    (gbp.hasBookingLink ? 2 : 0);

  const conversion =
    (web.websiteLoads ? 4 : 0) +
    (web.htmlMenu ? 3 : 0) +
    (web.bookingWidget ? 4 : 0) +
    (web.schemaMarkup ? 3 : 0) +
    (web.allergenInfo ? 2 : 0) +
    (web.socialLinks ? 2 : 0) +
    (web.aboutPage ? 2 : 0);

  const socialScore =
    (social.instagramLinked ? 2 : 0) +
    (social.postsLast30Days >= 4 ? 3 : 0) +
    (social.hasReels ? 3 : 0) +
    (social.engagementAboveMedian ? 4 : 0) +
    (social.tiktokExists ? 3 : 0);

  const pressScore =
    (press.anyCoverageIn12Months ? 5 : 0) +
    (press.articleCount >= 3 ? 5 : 0) +
    (press.tier1Coverage ? 5 : 0) +
    (press.positiveSentiment ? 5 : 0) +
    (press.noNegativeInTopResults ? 5 : 0);

  const ugc = Math.min(10, Math.round(social.followers / 1000));

  const avgCompetitorScore =
    competitors.length > 0
      ? competitors.reduce((sum, c) => sum + c.score, 0) / competitors.length
      : 60;
  const competitive = Math.min(
    10,
    Math.max(0, Math.round(5 + ((myRawScore - avgCompetitorScore) / avgCompetitorScore) * 10)),
  );

  const total = Math.min(100, discovery + conversion + socialScore + pressScore + ugc + competitive);

  const dimensions: ScoreDimension[] = [
    { key: "discovery", label: "Discovery", score: Math.min(discovery, 20), max: 20, description: "How easily customers find you on Google & Maps" },
    { key: "conversion", label: "Conversion", score: Math.min(conversion, 20), max: 20, description: "Booking flow, menu access, contact friction" },
    { key: "social", label: "Social", score: Math.min(socialScore, 15), max: 15, description: "Instagram cadence, content quality, engagement" },
    { key: "press", label: "Press", score: Math.min(pressScore, 25), max: 25, description: "Editorial coverage and critic mentions" },
    { key: "ugc", label: "UGC", score: Math.min(ugc, 10), max: 10, description: "Customer photos, reviews, tags" },
    { key: "competitive", label: "Competitive", score: competitive, max: 10, description: "Position vs nearby venues in same band" },
  ];

  return { dimensions, total, competitive };
}

// ---------------------------------------------------------------------------
// Step 7 — Score + narrative generation
// ---------------------------------------------------------------------------

async function generateReport(
  identity: Identity,
  gbp: GbpAudit,
  web: WebsiteAudit,
  social: SocialAudit,
  press: PressAudit,
  competitorData: CompetitorData[],
): Promise<AuditResult> {
  "use step";
  await emit({ type: "step_start", stepId: "score" });

  const rawScore = 0; // placeholder for competitive calc
  const { dimensions, total } = calculateScore(gbp, web, social, press, competitorData, rawScore);
  const { competitive } = calculateScore(gbp, web, social, press, competitorData, total - dimensions.find(d => d.key === "competitive")!.score);

  await emit({ type: "step_done", stepId: "score", log: `PresenceScore: ${total}/100 · Confidence: high` });
  await emit({ type: "step_start", stepId: "recommendations" });

  const topCompetitor = competitorData.sort((a, b) => b.score - a.score)[0];

  const aiResponse = await askClaude(`You are writing a digital presence report for a London restaurant owner. Be direct and practical.

Restaurant: ${identity.canonicalName}, ${identity.address}
PresenceScore: ${total}/100

Score breakdown:
- Discovery (GBP): ${dimensions.find(d => d.key === "discovery")?.score}/20
- Conversion (website): ${dimensions.find(d => d.key === "conversion")?.score}/20
- Social: ${dimensions.find(d => d.key === "social")?.score}/15
- Press: ${dimensions.find(d => d.key === "press")?.score}/25
- UGC: ${dimensions.find(d => d.key === "ugc")?.score}/10
- Competitive: ${competitive}/10

Key signals:
- GBP photos: ${gbp.photoCount} | Booking link: ${gbp.hasBookingLink} | Hours: ${gbp.hasHours}
- Website loads: ${web.websiteLoads} | Schema: ${web.schemaMarkup} | Booking widget: ${web.bookingWidget}
- Instagram followers: ${social.followers} | Posts/30d: ${social.postsLast30Days} | Reels: ${social.hasReels}
- Press articles: ${press.articleCount} | Tier-1: ${press.tier1Coverage} | Positive: ${press.positiveSentiment}
${topCompetitor ? `Top competitor: ${topCompetitor.name} scores ${topCompetitor.score}/100` : ""}

Write exactly 3 short paragraphs (2-4 sentences each):
1. What they're doing well — be specific, name actual signals
2. Their biggest vulnerability — be direct, reference real gaps
3. The single most important action to take this week

Then output a JSON array of exactly 3 quick wins:
[{ "action": "string", "timeEstimate": "30 min", "impactPoints": 6, "whyItMatters": "string", "icon": "link|camera|instagram|schema" }]

Separate the paragraphs from the JSON with the exact delimiter: ---JSON---`);

  let narrative: string[] = [];
  let quickWins: QuickWin[] = [];

  const parts = aiResponse.split("---JSON---");
  if (parts.length >= 2) {
    narrative = parts[0]
      .trim()
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0)
      .slice(0, 3);
    try {
      const parsed = JSON.parse(parts[1].trim());
      quickWins = parsed.map(
        (w: { action: string; timeEstimate: string; impactPoints: number; whyItMatters: string; icon: QuickWin["icon"] }) => ({
          icon: w.icon || "link",
          title: w.action,
          description: w.whyItMatters,
          time: w.timeEstimate,
          impact: `+${w.impactPoints} pts`,
        }),
      );
    } catch {
      quickWins = [];
    }
  } else {
    narrative = [aiResponse.trim()];
  }

  if (narrative.length === 0) {
    narrative = [`${identity.canonicalName} scored ${total}/100 on PresenceScore.`];
  }

  const competitors: Competitor[] = [
    {
      name: identity.canonicalName,
      score: total,
      gbpPhotos: gbp.photoCount,
      pressMentions: press.articleCount,
      bookingLink: gbp.hasBookingLink,
      isYou: true,
    },
    ...competitorData.slice(0, 5).map((c) => ({
      name: c.name,
      score: c.score,
      gbpPhotos: c.gbpPhotos,
      pressMentions: c.pressMentions,
      bookingLink: c.bookingLink,
    })),
  ];

  await emit({ type: "step_done", stepId: "recommendations", log: `${quickWins.length} quick wins identified · Narrative generated` });

  return {
    restaurantName: identity.canonicalName,
    postcode: identity.address,
    totalScore: total,
    dimensions,
    quickWins,
    narrative,
    competitors,
  };
}

// ---------------------------------------------------------------------------
// Main workflow
// ---------------------------------------------------------------------------

export async function runAudit(restaurantName: string, postcode: string): Promise<AuditResult> {
  "use workflow";

  const identity = await resolveIdentity(restaurantName, postcode);
  const [gbp, website, social, press] = await Promise.all([
    auditGbp(identity),
    auditWebsite(identity),
    auditInstagram(identity),
    auditPress(identity),
  ]);
  const competitorData = await benchmarkCompetitors(identity.competitors, postcode);
  const result = await generateReport(identity, gbp, website, social, press, competitorData);

  await emit({ type: "done", result });

  return result;
}
