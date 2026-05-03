export type AuditStep = {
  id: string
  label: string
  log: string
}

export const AUDIT_STEPS: AuditStep[] = [
  {
    id: "identity",
    label: "Resolving restaurant identity",
    log: "Matched on Google Places · Verified address · Cuisine: Modern British",
  },
  {
    id: "gbp",
    label: "Auditing Google Business Profile",
    log: "Found 23 photos on GBP · No booking link detected · 412 reviews (4.3 avg)",
  },
  {
    id: "website",
    label: "Auditing website",
    log: "Mobile score 78 · No structured data · Menu loads as PDF",
  },
  {
    id: "instagram",
    label: "Checking Instagram presence",
    log: "8.2k followers · Posting 1.4x/week · No reels in last 30 days",
  },
  {
    id: "press",
    label: "Scanning press coverage",
    log: "2 mentions in last 12 months · Time Out (2024) · Evening Standard (2023)",
  },
  {
    id: "competitors",
    label: "Running full audit on 5 competitors",
    log: "Compared against venues in the same postcode district",
  },
  {
    id: "score",
    label: "Calculating PresenceScore",
    log: "Aggregated 6 weighted dimensions · Confidence: high",
  },
  {
    id: "recommendations",
    label: "Generating recommendations",
    log: "Identified 8 opportunities · Ranked by effort vs impact",
  },
]

export type ScoreDimension = {
  key: string
  label: string
  score: number
  max: number
  description: string
}

export type QuickWin = {
  icon: "link" | "camera" | "instagram" | "schema"
  title: string
  description: string
  time: string
  impact: string
}

export type Competitor = {
  name: string
  /** Real numeric score — used internally for sorting. */
  score: number
  /**
   * Display string for non-`isYou` rows, e.g. `"60–70"`. Acknowledges that
   * competitor scores are derived from a (sometimes flaky) automated pipeline,
   * so we present them as a 10-point band rather than an exact number.
   */
  scoreRange?: string
  gbpPhotos: number
  pressMentions: number
  bookingLink: boolean
  isYou?: boolean
}

export type CoverageArticle = {
  title: string
  source: string
  date: string
  url?: string
  sentiment: "positive" | "neutral" | "negative"
  tier: "tier1" | "tier2" | "tier3"
}

export type AuditResult = {
  restaurantName: string
  postcode: string
  totalScore: number
  dimensions: ScoreDimension[]
  quickWins: QuickWin[]
  narrative: string[]
  competitors: Competitor[]
  articles: CoverageArticle[]
  /**
   * Internal fields populated only for competitor-only audits (audits saved
   * via `benchmarkCompetitorsFull`). Lets us reconstruct the competitor row
   * fields from a cached `AuditResult` without re-running the pipeline.
   * Not displayed in the UI.
   */
  _gbpPhotoCount?: number
  _pressMentions?: number
  _bookingLink?: boolean
}

export function generateAuditResult(
  restaurantName: string,
  postcode: string,
): AuditResult {
  return {
    restaurantName,
    postcode,
    totalScore: 58,
    dimensions: [
      {
        key: "discovery",
        label: "Discovery",
        score: 13,
        max: 20,
        description: "How easily customers find you on Google & Maps",
      },
      {
        key: "conversion",
        label: "Conversion",
        score: 9,
        max: 20,
        description: "Booking flow, menu access, contact friction",
      },
      {
        key: "social",
        label: "Social",
        score: 11,
        max: 15,
        description: "Instagram cadence, content quality, engagement",
      },
      {
        key: "press",
        label: "Press",
        score: 12,
        max: 25,
        description: "Editorial coverage and critic mentions",
      },
      {
        key: "ugc",
        label: "UGC",
        score: 7,
        max: 10,
        description: "Customer photos, reviews, tags",
      },
      {
        key: "competitive",
        label: "Competitive",
        score: 6,
        max: 10,
        description: "Position vs nearby venues in same band",
      },
    ],
    quickWins: [
      {
        icon: "link",
        title: "Add a direct booking link to Google Business Profile",
        description:
          "Customers searching your name on Google can't book in one tap. Adding a reservation link typically lifts conversion by 12–18%.",
        time: "30 min",
        impact: "+6 pts",
      },
      {
        icon: "camera",
        title: "Upload 15 high-quality dish photos to GBP",
        description:
          "Your competitors average 47 photos; you have 23. Listings with 40+ photos get 35% more clicks to website.",
        time: "1 hour",
        impact: "+5 pts",
      },
      {
        icon: "instagram",
        title: "Publish 4 reels over the next 14 days",
        description:
          "You haven't posted a reel in 30 days. Reels reach 3.2x more non-followers than static posts in the food vertical.",
        time: "2 hours",
        impact: "+4 pts",
      },
    ],
    narrative: [
      `${restaurantName} sits in the middle of the pack for ${postcode} — strong on social engagement and customer reviews, but losing meaningful ground on discovery and conversion. The fundamentals are in place: a verified Google profile, a working website, and a loyal Instagram following. The leak is at the moment of intent, when a hungry diner is one tap away from booking and can't find the button.`,
      `Press coverage is the single biggest drag on your score. Two mentions in twelve months puts you behind 4 of your 5 closest competitors, and editorial mentions compound — they feed Google's entity graph, drive UGC, and earn organic Instagram tags. A targeted PR push over the next quarter would unlock points across multiple dimensions at once.`,
      `The good news: every one of your top three quick wins can be shipped this week, by you, without an agency. Together they represent roughly 15 points of upside — enough to move you from amber into green and ahead of three direct competitors in your postcode.`,
    ],
    competitors: [
      {
        name: restaurantName,
        score: 58,
        gbpPhotos: 23,
        pressMentions: 2,
        bookingLink: false,
        isYou: true,
      },
      {
        name: "Brawn",
        score: 76,
        gbpPhotos: 89,
        pressMentions: 7,
        bookingLink: true,
      },
      {
        name: "St. John Bread and Wine",
        score: 81,
        gbpPhotos: 64,
        pressMentions: 12,
        bookingLink: true,
      },
      {
        name: "Lyle's",
        score: 72,
        gbpPhotos: 51,
        pressMentions: 9,
        bookingLink: true,
      },
      {
        name: "Smoking Goat",
        score: 64,
        gbpPhotos: 42,
        pressMentions: 4,
        bookingLink: true,
      },
      {
        name: "Rochelle Canteen",
        score: 55,
        gbpPhotos: 31,
        pressMentions: 3,
        bookingLink: false,
      },
    ],
    articles: [
      // Q3 2024
      {
        title: "The best new restaurant openings in London",
        source: "Time Out",
        date: "2024-08-12",
        sentiment: "positive",
        tier: "tier1",
      },
      {
        title: "Where to dine in Mayfair this summer",
        source: "Evening Standard",
        date: "2024-07-22",
        sentiment: "positive",
        tier: "tier1",
      },
      // Q4 2024
      {
        title: "London's hidden dining gems",
        source: "Eater London",
        date: "2024-11-05",
        sentiment: "neutral",
        tier: "tier2",
      },
      {
        title: "A critic's guide to Mayfair restaurants",
        source: "Hot Dinners",
        date: "2024-10-18",
        sentiment: "positive",
        tier: "tier2",
      },
      // Q1 2025
      {
        title: "Review: dinner in the heart of Mayfair",
        source: "Square Meal",
        date: "2025-02-14",
        sentiment: "neutral",
        tier: "tier3",
      },
      // Q2 2025
      {
        title: "The best Italian-influenced menus in London",
        source: "The Guardian",
        date: "2025-05-03",
        sentiment: "positive",
        tier: "tier1",
      },
      {
        title: "Service issues mar an otherwise solid meal",
        source: "Time Out",
        date: "2025-06-11",
        sentiment: "negative",
        tier: "tier1",
      },
      // Q3 2025
      {
        title: "Mayfair dining: the definitive round-up",
        source: "Evening Standard",
        date: "2025-08-20",
        sentiment: "positive",
        tier: "tier1",
      },
      // Q4 2025
      {
        title: "Our favourite restaurants of 2025",
        source: "Hot Dinners",
        date: "2025-12-01",
        sentiment: "positive",
        tier: "tier2",
      },
      // Q1 2026
      {
        title: "Where to eat in London right now",
        source: "Eater London",
        date: "2026-01-29",
        sentiment: "neutral",
        tier: "tier2",
      },
      // Q2 2026
      {
        title: "Spring menus worth booking for",
        source: "Square Meal",
        date: "2026-04-10",
        sentiment: "positive",
        tier: "tier3",
      },
    ],
  }
}
