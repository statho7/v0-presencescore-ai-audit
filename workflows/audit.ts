import { getWritable, FatalError, RetryableError } from "workflow";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { AuditResult, QuickWin, Competitor, ScoreDimension, CoverageArticle } from "@/lib/audit-data";

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

async function serpSearch(query: string, news = false, sortByDate = false, includeUrls = false): Promise<string> {
  console.log(`[serpSearch] query="${query}" news=${news} sortByDate=${sortByDate}`);
  const dateParam = sortByDate ? "&tbs=sbd:1" : "";
  const base = news
    ? `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=gb&hl=en&tbm=nws&num=100${dateParam}`
    : `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=gb&hl=en&num=100${dateParam}`;
  const res = await fetch(BD_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zone: process.env.BRIGHTDATA_UNLOCKER_ZONE,
      url: base,
      format: "raw",
    }),
  });
  if (res.status === 429) throw new RetryableError("Bright Data rate limited", { retryAfter: "30s" });
  if (!res.ok) throw new FatalError(`Google search failed: ${res.status}`);
  const html = await res.text();

  // Extract article URLs from href attributes before stripping HTML
  let urlSection = "";
  if (includeUrls) {
    const redirectMatches = [...html.matchAll(/href="\/url\?q=(https?:\/\/[^&"]+)/g)];
    let urls = redirectMatches.map(m => { try { return decodeURIComponent(m[1]); } catch { return m[1]; } });
    // Fallback for Google News which uses direct hrefs instead of redirect URLs
    if (urls.length === 0) {
      const directMatches = [...html.matchAll(/href="(https?:\/\/(?!(?:www\.|accounts\.|support\.|policies\.)google\.)[^"]+)"/g)];
      urls = directMatches.map(m => m[1]);
    }
    const deduped = [...new Set(urls)].filter(u => !u.includes("google.com")).slice(0, 50);
    if (deduped.length > 0) {
      urlSection = "\n\n[ARTICLE URLS]\n" + deduped.map((u, i) => `${i + 1}. ${u}`).join("\n") + "\n[/ARTICLE URLS]";
      console.log(`[serpSearch] extracted ${deduped.length} URLs`);
    }
  }

  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const truncated = (text.slice(0, 8000) + urlSection);
  console.log(`[serpSearch] raw text length=${text.length} truncated=${truncated.length} preview="${text.slice(0, 300)}"`);
  return truncated;
}

async function unlockUrl(url: string): Promise<string> {
  console.log(`[unlockUrl] fetching url="${url}"`);
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
  const truncated = text.slice(0, 6000);
  console.log(`[unlockUrl] url="${url}" raw length=${text.length} truncated=${truncated.length}`);
  return truncated;
}

async function getInstagramProfile(handle: string): Promise<string> {
  // Try fetching the profile page directly first — Bright Data's Web Unlocker
  // can render JS and return HTML that contains the follower count in meta tags
  // and the page title. Fall back to SERP if the direct fetch yields no data.
  console.log(`[getInstagramProfile] handle="${handle}" (direct fetch + SERP fallback)`);

  try {
    const html = await unlockUrl(`https://www.instagram.com/${handle}/`);
    // Instagram embeds follower count in og:description meta tag and page title
    // e.g. "2,828 Followers, 899 Following, 267 Posts"
    const hasMeta = html.includes("Followers") || html.includes("followers");
    console.log(`[getInstagramProfile] direct fetch length=${html.length} hasMeta=${hasMeta}`);
    if (hasMeta) return html;
  } catch (err) {
    console.log(`[getInstagramProfile] direct fetch failed: ${err}`);
  }

  // Fallback: Google SERP knowledge panel
  console.log(`[getInstagramProfile] falling back to SERP`);
  return serpSearch(`"${handle}" instagram followers site:instagram.com OR instagram.com`);
}

// ---------------------------------------------------------------------------
// AI Gateway call
// ---------------------------------------------------------------------------

async function askStructured<T>(label: string, prompt: string, schema: z.ZodType<T>): Promise<T> {
  console.log(`[askStructured] label="${label}" prompt length=${prompt.length}`);
  const { output } = await generateText({
    model: "anthropic/claude-sonnet-4.6",
    output: Output.object({ schema }),
    prompt,
  });
  console.log(`[askStructured] label="${label}" output=${JSON.stringify(output).slice(0, 200)}`);
  return output;
}

async function askClaude(label: string, prompt: string): Promise<string> {
  console.log(`[askClaude] label="${label}" prompt length=${prompt.length}`);
  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4.6",
    prompt,
  });
  console.log(`[askClaude] label="${label}" response length=${text.length} preview="${text.slice(0, 200)}"`);
  return text;
}

// ---------------------------------------------------------------------------
// Emit helper — must be called inside a step
// ---------------------------------------------------------------------------

async function emit(event: AuditEvent): Promise<void> {
  "use step";
  console.log(`[emit] type="${event.type}" ${"stepId" in event ? `stepId="${event.stepId}"` : ""}`);
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
  console.log(`[resolveIdentity] START name="${restaurantName}" postcode="${postcode}"`);
  await emit({ type: "step_start", stepId: "identity" });

  const raw = await serpSearch(`${restaurantName} restaurant ${postcode} London`);

  // Second SERP: search specifically for nearby competitors in the same postcode district
  const district = postcode.split(" ")[0]; // e.g. "SE1" from "SE1 8HA"
  const competitorRaw = await serpSearch(`restaurants pubs near ${postcode} London ${district} site:google.com/maps OR "near me" -site:tripadvisor.com`);

  const identitySchema = z.object({
    canonicalName: z.string(),
    address: z.string(),
    websiteUrl: z.string(),
    instagramHandle: z.string(),
    gbpRating: z.number(),
    gbpReviews: z.number(),
    gbpPhotos: z.number(),
    hasBookingLink: z.boolean(),
    hasHours: z.boolean(),
    competitors: z.array(z.string()),
  });

  const identity = await askStructured("identity", `You are parsing Google Search results for a London restaurant lookup. The text has been stripped of HTML tags.

Query: "${restaurantName} restaurant ${postcode} London"
Stripped Google SERP text: ${raw}

Look for:
- The restaurant name as it appears on Google
- Its address (street names, postcodes like SE1, EC1)
- Website URL (domains like .co.uk, .com near the restaurant name)
- Instagram handle (instagram.com/... URLs or @handle mentions)
- Star rating (numbers like 4.1 followed by star symbols or "stars")
- Review count (numbers followed by "reviews" or in parentheses)
- Photo count (numbers followed by "photos" or "images" in the knowledge panel)
- Booking signals (Reserve, Book, OpenTable, Resy, SevenRooms)
- Hours (Open, Closed, day names, time patterns)

Nearby competitors SERP (geographically close venues — use ONLY these for competitors):
${competitorRaw}

Rules:
- Use empty string for text fields not found, 0 for numbers not found, false for booleans not found
- competitors: pick 5 restaurants/pubs from the nearby competitors SERP that are NOT "${restaurantName}" and are in the ${district} area`, identitySchema);

  const log = `Found on Google · ${identity.gbpReviews} reviews (${identity.gbpRating}★) · ${identity.gbpPhotos} photos`;
  console.log(`[resolveIdentity] DONE log="${log}" websiteUrl="${identity.websiteUrl}" instagramHandle="${identity.instagramHandle}"`);
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
  console.log(`[auditGbp] START name="${identity.canonicalName}" photos=${identity.gbpPhotos} reviews=${identity.gbpReviews}`);
  await emit({ type: "step_start", stepId: "gbp" });

  try {
    const serpData = await serpSearch(`"${identity.canonicalName}" "${identity.address.split(",")[0]}" London pub restaurant`);

    const raw = serpData;

    const gbpSchema = z.object({
      gbpClaimed: z.boolean(),
      inLocalPack: z.boolean(),
      photoCount: z.number(),
      hasBookingLink: z.boolean(),
      hasHours: z.boolean(),
      hasMenuLink: z.boolean(),
      specificCategory: z.boolean(),
    });

    const audit = await askStructured("gbp", `Analyse Google data to audit a restaurant's Google Business Profile.

Restaurant: ${identity.canonicalName}, ${identity.address}
Known signals:
- Rating: ${identity.gbpRating} stars, Reviews: ${identity.gbpReviews}, Has hours: ${identity.hasHours}, Has booking link: ${identity.hasBookingLink}

Data (SERP + Maps page): ${raw}

Rules:
- gbpClaimed: true because reviews=${identity.gbpReviews} > 0
- inLocalPack: true if the restaurant appears in a map/local pack
- photoCount: scan for ANY number followed by "photo", "photos", "image", "images", or "See all". Also look for patterns like "Photos (123)" or "123 photos added". If genuinely not found, use ${identity.gbpPhotos}
- hasBookingLink: true if Reserve, Book, OpenTable, Resy, SevenRooms appears — or use ${identity.hasBookingLink}
- hasMenuLink: true if a menu URL or "Menu" link appears
- specificCategory: true if a specific cuisine type appears (Pub, British, Thai, Italian etc)`, gbpSchema);

    const inferredPhotoCount =
      audit.photoCount > 0
        ? audit.photoCount
        : identity.gbpReviews >= 500
          ? Math.round(identity.gbpReviews * 0.15)
          : identity.gbpReviews >= 100
            ? Math.round(identity.gbpReviews * 0.1)
            : 0;

    const auditWithPhotos = { ...audit, photoCount: inferredPhotoCount };
    console.log(`[auditGbp] parsed audit=${JSON.stringify(audit)} inferredPhotoCount=${inferredPhotoCount}`);

    const log = `~${inferredPhotoCount} photos (inferred) · ${auditWithPhotos.hasBookingLink ? "Booking link found" : "No booking link"} · ${auditWithPhotos.hasHours ? "Hours set" : "No hours"}`;
    console.log(`[auditGbp] DONE log="${log}"`);
    await emit({ type: "step_done", stepId: "gbp", log });
    return auditWithPhotos;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[auditGbp] ERROR err="${msg}"`);
    await emit({ type: "step_error", stepId: "gbp", error: msg });
    return { gbpClaimed: false, inLocalPack: false, photoCount: 0, hasBookingLink: false, hasHours: false, hasMenuLink: false, specificCategory: false };
  }
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
  console.log(`[auditWebsite] START name="${identity.canonicalName}" websiteUrl="${identity.websiteUrl}"`);
  await emit({ type: "step_start", stepId: "website" });

  if (!identity.websiteUrl) {
    console.log(`[auditWebsite] no website URL — skipping`);
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

  try {
    const html = await unlockUrl(identity.websiteUrl);

    const websiteSchema = z.object({
      websiteLoads: z.boolean(),
      htmlMenu: z.boolean(),
      bookingWidget: z.boolean(),
      schemaMarkup: z.boolean(),
      allergenInfo: z.boolean(),
      socialLinks: z.boolean(),
      aboutPage: z.boolean(),
      mobileScore: z.number(),
    });

    const audit = await askStructured("website", `Audit this restaurant website HTML for digital presence signals.

Restaurant: ${identity.canonicalName}
Website HTML (truncated): ${html}

Rules:
- websiteLoads: always true since we have HTML
- htmlMenu: true if there's an inline menu (not just a PDF link)
- bookingWidget: true if there's an embedded booking form/button
- schemaMarkup: true if you see application/ld+json or schema.org
- allergenInfo: true if allergen or dietary information is present
- socialLinks: true if Instagram, Facebook, or Twitter links appear
- aboutPage: true if an About or Story section exists
- mobileScore: estimate 0-100 based on viewport meta, responsive CSS, font sizes`, websiteSchema);
    const auditWithLoads = { ...audit, websiteLoads: true };
    console.log(`[auditWebsite] parsed audit=${JSON.stringify(auditWithLoads)}`);

    const log = `Mobile score ~${auditWithLoads.mobileScore} · ${auditWithLoads.schemaMarkup ? "Schema markup found" : "No schema markup"} · ${auditWithLoads.bookingWidget ? "Booking widget present" : "No booking widget"}`;
    console.log(`[auditWebsite] DONE log="${log}"`);
    await emit({ type: "step_done", stepId: "website", log });
    return auditWithLoads;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[auditWebsite] ERROR err="${msg}"`);
    await emit({ type: "step_error", stepId: "website", error: msg });
    return { websiteLoads: false, htmlMenu: false, bookingWidget: false, schemaMarkup: false, allergenInfo: false, socialLinks: false, aboutPage: false, mobileScore: 0 };
  }
}

// ---------------------------------------------------------------------------
// Step 4 — Instagram audit
// ---------------------------------------------------------------------------

type SocialAudit = {
  instagramLinked: boolean;
  followers: number;
  postsLast30Days: number;
  postedLast14Days: boolean;
  customerInstagramPosts: number;
  hasReels: boolean;
  engagementAboveMedian: boolean;
  tiktokExists: boolean;
};

async function auditInstagram(identity: Identity): Promise<SocialAudit> {
  "use step";
  console.log(`[auditInstagram] START name="${identity.canonicalName}" handle="${identity.instagramHandle}"`);
  await emit({ type: "step_start", stepId: "instagram" });

  // If identity didn't find a handle, search Google for it
  let handle = identity.instagramHandle;
  if (!handle) {
    console.log(`[auditInstagram] no handle from identity — searching Google for Instagram`);
    const igSearch = await serpSearch(`${identity.canonicalName} ${identity.address} instagram`);
    const igHandle = await askClaude("instagram-handle", `Find the Instagram handle for this restaurant from Google search results.

Restaurant: ${identity.canonicalName}, ${identity.address}
Search results: ${igSearch}

Look for instagram.com/... URLs or @handle mentions near the restaurant name.
Return ONLY the handle without @ (e.g. "roseandcrownse1"), or empty string if not found.
No JSON, no markdown — just the raw handle string or empty string.`);
    handle = igHandle.replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "").trim();
    console.log(`[auditInstagram] Google search found handle="${handle}"`);
  }

  if (!handle) {
    console.log(`[auditInstagram] no Instagram handle found anywhere — skipping`);
    const log = "No Instagram account found";
    await emit({ type: "step_done", stepId: "instagram", log });
    return {
      instagramLinked: false,
      followers: 0,
      postsLast30Days: 0,
      postedLast14Days: false,
      customerInstagramPosts: 0,
      hasReels: false,
      engagementAboveMedian: false,
      tiktokExists: false,
    };
  }

  try {
    const html = await getInstagramProfile(handle);
    console.log(`[auditInstagram] serp length=${html.length}`);

    const socialSchema = z.object({
      instagramLinked: z.boolean(),
      followers: z.number(),
      postsLast30Days: z.number(),
      postedLast14Days: z.boolean(),
      customerInstagramPosts: z.number(),
      hasReels: z.boolean(),
      engagementAboveMedian: z.boolean(),
      tiktokExists: z.boolean(),
    });

    const audit = await askStructured("instagram", `Extract Instagram presence data for a London restaurant from this page data.

Handle: @${handle}
Page data (may be raw HTML from instagram.com or a Google SERP snippet): ${html}

Rules:
- instagramLinked: true since we have a handle
- followers: look for ALL of these patterns (pick whichever appears):
    * In meta tags: content="2,828 Followers" or og:description containing "X Followers"
    * In page title: "theringse1 • Instagram" plus a nearby follower figure
    * Plain text: "2,828 followers", "2.8K followers", "2.8k Followers"
    * JSON-LD or script data: "follower_count":2828
    Convert any K/M suffix to the full integer (2.8K → 2800). Use 0 only if truly absent.
- postsLast30Days: look for post count (267 posts) and estimate recency; default 4 if unclear
- postedLast14Days: true if the account appears to have posted within the last 14 days
- customerInstagramPosts: estimate how many third-party (non-restaurant) posts mention or tag this venue on Instagram — look for location tag counts, tagged post mentions, or any signal of customer-generated content. Use 0 if no signal found.
- hasReels: true if "Reels" tab, reel icon, or reel content is mentioned
- engagementAboveMedian: true if strong engagement signals appear relative to follower count
- tiktokExists: true if a TikTok account for this restaurant is mentioned`, socialSchema);
    console.log(`[auditInstagram] parsed audit=${JSON.stringify(audit)}`);

    const log = `@${handle} · ${audit.followers.toLocaleString()} followers · ${audit.postsLast30Days} posts/30d · ${audit.hasReels ? "Has reels" : "No recent reels"}`;
    console.log(`[auditInstagram] DONE log="${log}"`);
    await emit({ type: "step_done", stepId: "instagram", log });
    return audit;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[auditInstagram] ERROR err="${msg}"`);
    await emit({ type: "step_error", stepId: "instagram", error: msg });
    return { instagramLinked: false, followers: 0, postsLast30Days: 0, postedLast14Days: false, customerInstagramPosts: 0, hasReels: false, engagementAboveMedian: false, tiktokExists: false };
  }
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
  articleSources: string[];
  articleDates: string[];
  articleUrls: string[];
};

async function auditPress(identity: Identity): Promise<PressAudit> {
  "use step";
  console.log(`[auditPress] START name="${identity.canonicalName}"`);
  await emit({ type: "step_start", stepId: "press" });

  // Strip generic venue-type words so "BRAT Restaurant" → "BRAT" — press articles say "Brat", not "BRAT Restaurant"
  const pressName = identity.canonicalName
    .replace(/\s+(restaurant|bar|café|cafe|bistro|brasserie|kitchen|grill|pub|eatery|dining)\s*$/i, "")
    .trim() || identity.canonicalName;

  try {
    // Google News sorted newest-first. Second query covers food media not in News (Eater, Hot Dinners etc), also newest-first.
    const newsQuery = `"${pressName}" London restaurant`;
    const broadQuery = `"${pressName}" London restaurant review (site:theguardian.com OR site:timeout.com OR site:standard.co.uk OR site:telegraph.co.uk OR site:independent.co.uk OR site:eater.com OR site:hotdinners.com)`;
    console.log(`[auditPress] pressName="${pressName}" newsQuery="${newsQuery}"`);
    const [newsRaw, broadRaw] = await Promise.all([
      serpSearch(newsQuery, true, true, true),
      serpSearch(broadQuery, false, true, true),
    ]);
    const raw = `=== GOOGLE NEWS ===\n${newsRaw}\n\n=== FOOD PRESS SERP ===\n${broadRaw}`;

    const pressSchema = z.object({
      articleCount: z.number(),
      anyCoverageIn12Months: z.boolean(),
      tier1Coverage: z.boolean(),
      positiveSentiment: z.boolean(),
      noNegativeInTopResults: z.boolean(),
      articleTitles: z.array(z.string()),
      articleSources: z.array(z.string()),
      articleDates: z.array(z.string()),
      articleUrls: z.array(z.string()),
    });

    const audit = await askStructured("press", `Analyse press coverage for a specific London restaurant.

Restaurant: ${identity.canonicalName}
Address: ${identity.address}
Google News / SERP data: ${raw}

Rules:
- Only count articles genuinely about THIS restaurant at ${identity.address} — ignore same-name venues elsewhere
- tier1Coverage: true if Guardian, Time Out, Evening Standard, Telegraph, or Independent
- positiveSentiment: true if coverage tone is positive or mixed-positive
- noNegativeInTopResults: true if no clearly negative reviews appear
- If no relevant articles found, use articleCount: 0 and all false
- articleTitles: clean article title only (no source name, no date)
- articleSources: publication name for each article in the same order (e.g. "The Guardian", "Time Out", "Eater London"); use "Unknown" only if genuinely absent
- articleDates: ISO date string for each article; infer from URL slugs, snippet dates, or relative dates; use "" if truly unknown
- articleUrls: for each article, use the matching URL from the [ARTICLE URLS] section in the SERP data (match by domain or title keywords); use "" only if no matching URL can be found`, pressSchema);
    console.log(`[auditPress] parsed audit=${JSON.stringify(audit)}`);

    const log = `${audit.articleCount} article${audit.articleCount !== 1 ? "s" : ""} found · ${audit.tier1Coverage ? "Tier-1 coverage" : "No tier-1"} · ${audit.positiveSentiment ? "Positive sentiment" : "Mixed/negative sentiment"}`;
    console.log(`[auditPress] DONE log="${log}"`);
    await emit({ type: "step_done", stepId: "press", log });
    return audit;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[auditPress] ERROR err="${msg}"`);
    await emit({ type: "step_error", stepId: "press", error: msg });
    return { articleCount: 0, anyCoverageIn12Months: false, tier1Coverage: false, positiveSentiment: false, noNegativeInTopResults: false, articleTitles: [], articleSources: [], articleDates: [], articleUrls: [] };
  }
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
  console.log(`[benchmarkCompetitors] START competitors=${JSON.stringify(competitors)} postcode="${postcode}"`);
  await emit({ type: "step_start", stepId: "competitors" });

  const names = competitors.slice(0, 5);
  const raw = await serpSearch(`${names.join(" OR ")} restaurant ${postcode} London`);

  const competitorSchema = z.object({
    competitors: z.array(z.object({
      name: z.string(),
      score: z.number(),
      gbpPhotos: z.number(),
      pressMentions: z.number(),
      bookingLink: z.boolean(),
    })),
  });

  const { competitors: data } = await askStructured("competitors", `Benchmark ${names.length} competitor restaurants near ${postcode}, London.

Competitors: ${names.join(", ")}
SERP data: ${raw}

Estimate scores 0-90 based on what you can infer from the SERP. Return one entry per competitor in the competitors array.`, competitorSchema);
  console.log(`[benchmarkCompetitors] parsed ${data.length} competitors`);

  const log = `Benchmarked ${data.length} competitors in ${postcode}`;
  console.log(`[benchmarkCompetitors] DONE log="${log}"`);
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
  gbpReviews: number = 0,
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
    (social.postedLast14Days ? 3 : 0) +
    (social.hasReels ? 3 : 0) +
    (social.engagementAboveMedian ? 4 : 0) +
    (social.tiktokExists ? 3 : 0);

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const recentDates = (press.articleDates ?? []).filter(d => d && new Date(d) >= cutoff);
  const anyCoverageIn12Months = recentDates.length > 0 || press.anyCoverageIn12Months;
  const recentArticleCount = recentDates.length > 0 ? recentDates.length : press.articleCount;

  const pressScore =
    (anyCoverageIn12Months ? 5 : 0) +
    (recentArticleCount >= 3 ? 5 : 0) +
    (press.tier1Coverage ? 5 : 0) +
    (press.positiveSentiment ? 5 : 0) +
    (press.noNegativeInTopResults ? 5 : 0);

  // UGC: customer-generated Instagram posts are the strongest signal of organic
  // presence. Fall back to follower count tiers when no customer-post signal is found.
  const ugc =
    social.customerInstagramPosts >= 10 ? 5 :
    social.customerInstagramPosts >= 3  ? 2 :
    social.followers >= 5000            ? 3 :
    social.followers >= 1000            ? 1 : 0;

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
  console.log(`[generateReport] START name="${identity.canonicalName}"`);
  await emit({ type: "step_start", stepId: "score" });

  // First pass: calculate score without competitive dimension (pass 0) to get base total
  const { dimensions: baseDimensions, total: baseTotal } = calculateScore(gbp, web, social, press, competitorData, 0, identity.gbpReviews);
  const baseWithoutCompetitive = baseTotal - baseDimensions.find(d => d.key === "competitive")!.score;
  // Second pass: use the base score as myRawScore so competitive is calculated against real competitor avg
  const { dimensions, total, competitive } = calculateScore(gbp, web, social, press, competitorData, baseWithoutCompetitive, identity.gbpReviews);

  console.log(`[generateReport] total=${total} dimensions=${JSON.stringify(dimensions.map(d => ({ key: d.key, score: d.score })))}`);
  await emit({ type: "step_done", stepId: "score", log: `PresenceScore: ${total}/100 · Confidence: high` });
  await emit({ type: "step_start", stepId: "recommendations" });

  const topCompetitor = competitorData.sort((a, b) => b.score - a.score)[0];

  const aiResponse = await askClaude("report", `You are writing a digital presence report for a London restaurant owner. Be direct and practical.

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

Write exactly 3 short paragraphs (2-4 sentences each). No headers, no markdown formatting, no bold text, no bullet points — plain prose only:
1. What they're doing well — be specific, name actual signals
2. Their biggest vulnerability — be direct, reference real gaps
3. The single most important action to take this week

Then output a JSON array of exactly 3 quick wins:
[{ "action": "string", "timeEstimate": "30 min", "impactPoints": 6, "whyItMatters": "string", "icon": "link|camera|instagram|schema" }]

Separate the paragraphs from the JSON with the exact delimiter: ---JSON---`);

  let narrative: string[] = [];
  let quickWins: QuickWin[] = [];

  const parts = aiResponse.split("---JSON---");
  console.log(`[generateReport] aiResponse parts=${parts.length}`);
  if (parts.length >= 2) {
    narrative = parts[0]
      .trim()
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0)
      .slice(0, 3);
    try {
      // Strip any code fences Claude wraps around the JSON array
      const jsonRaw = parts[1].trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      console.log(`[generateReport] quickWins raw="${jsonRaw.slice(0, 100)}"`);
      const parsed = JSON.parse(jsonRaw);
      quickWins = parsed.map(
        (w: { action: string; timeEstimate: string; impactPoints: number; whyItMatters: string; icon: QuickWin["icon"] }) => ({
          icon: w.icon || "link",
          title: w.action,
          description: w.whyItMatters,
          time: w.timeEstimate,
          impact: `+${w.impactPoints} pts`,
        }),
      );
      console.log(`[generateReport] quickWins=${quickWins.length} narrative paragraphs=${narrative.length}`);
    } catch (err) {
      console.log(`[generateReport] quickWins JSON parse failed err=${err}`);
      quickWins = [];
    }
  } else {
    console.log(`[generateReport] no ---JSON--- delimiter found — using raw response as narrative`);
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
  console.log(`[generateReport] DONE total=${total} quickWins=${quickWins.length}`);

  const TIER1_SOURCES = ["guardian", "time out", "timeout", "evening standard", "telegraph", "independent"];
  const articles: CoverageArticle[] = press.articleTitles.map((title, idx): CoverageArticle => {
    const source = press.articleSources?.[idx] || "Unknown";
    const rawDate = press.articleDates?.[idx] || "";
    const parsed = rawDate ? new Date(rawDate) : null;
    const isoDate = parsed && !isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : "";
    const url = press.articleUrls?.[idx]?.startsWith("http") ? press.articleUrls[idx] : undefined;
    const tier: CoverageArticle["tier"] = TIER1_SOURCES.some((s) => source.toLowerCase().includes(s)) ? "tier1" : "tier2";
    const sentiment: CoverageArticle["sentiment"] = press.positiveSentiment ? "positive" : "neutral";
    return { title, source, date: isoDate, url, sentiment, tier };
  });
  console.log(`[generateReport] articles parsed=${articles.length}`);

  return {
    restaurantName: identity.canonicalName,
    postcode: identity.address,
    totalScore: total,
    dimensions,
    quickWins,
    narrative,
    competitors,
    articles,
  };
}

// ---------------------------------------------------------------------------
// Main workflow
// ---------------------------------------------------------------------------

export async function runAudit(restaurantName: string, postcode: string): Promise<AuditResult> {
  "use workflow";
  console.log(`[runAudit] START restaurantName="${restaurantName}" postcode="${postcode}"`);

  const identity = await resolveIdentity(restaurantName, postcode);
  console.log(`[runAudit] identity resolved, starting parallel audit steps`);

  const [gbpResult, websiteResult, socialResult, pressResult] = await Promise.allSettled([
    auditGbp(identity),
    auditWebsite(identity),
    auditInstagram(identity),
    auditPress(identity),
  ]);

  const gbp = gbpResult.status === "fulfilled" ? gbpResult.value
    : { gbpClaimed: false, inLocalPack: false, photoCount: 0, hasBookingLink: false, hasHours: false, hasMenuLink: false, specificCategory: false };
  const website = websiteResult.status === "fulfilled" ? websiteResult.value
    : { websiteLoads: false, htmlMenu: false, bookingWidget: false, schemaMarkup: false, allergenInfo: false, socialLinks: false, aboutPage: false, mobileScore: 0 };
  const social = socialResult.status === "fulfilled" ? socialResult.value
    : { instagramLinked: false, followers: 0, postsLast30Days: 0, postedLast14Days: false, customerInstagramPosts: 0, hasReels: false, engagementAboveMedian: false, tiktokExists: false };
  const press = pressResult.status === "fulfilled" ? pressResult.value
    : { articleCount: 0, anyCoverageIn12Months: false, tier1Coverage: false, positiveSentiment: false, noNegativeInTopResults: false, articleTitles: [], articleSources: [], articleDates: [], articleUrls: [] };

  console.log(`[runAudit] parallel steps done gbp=${gbpResult.status} website=${websiteResult.status} social=${socialResult.status} press=${pressResult.status}`);

  const competitorData = await benchmarkCompetitors(identity.competitors, postcode);
  console.log(`[runAudit] competitor benchmark done, generating report`);

  const result = await generateReport(identity, gbp, website, social, press, competitorData);

  await emit({ type: "done", result });
  console.log(`[runAudit] DONE total=${result.totalScore}`);

  return result;
}
