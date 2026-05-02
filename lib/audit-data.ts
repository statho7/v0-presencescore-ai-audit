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
    label: "Benchmarking 5 competitors",
    log: "Compared against E1/E2 venues in same cuisine band",
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
  score: number
  gbpPhotos: number
  pressMentions: number
  bookingLink: boolean
  isYou?: boolean
}

export type AuditResult = {
  restaurantName: string
  postcode: string
  totalScore: number
  dimensions: ScoreDimension[]
  quickWins: QuickWin[]
  narrative: string[]
  competitors: Competitor[]
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
  }
}
