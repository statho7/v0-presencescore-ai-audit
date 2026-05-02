import { generateText, Output } from "ai"
import { z } from "zod"

export type DedupeCandidate = {
  runId: string
  restaurantName: string
  postcode: string
  createdAt: string
}

export type DedupeMatch = {
  matchedRunId: string | null
  confidence: "high" | "medium" | "low"
  reasoning: string
}

const DedupeSchema = z.object({
  matchedRunId: z
    .string()
    .nullable()
    .describe("The runId of the matching candidate, or null if none of the candidates is the same restaurant."),
  confidence: z.enum(["high", "medium", "low"]).describe("How confident you are in the match (or non-match)."),
  reasoning: z.string().describe("One short sentence explaining the decision."),
})

/**
 * Asks an LLM to decide whether the user-supplied (name, postcode) refers to
 * the same restaurant as one of the recent stored audits. Returns the matching
 * runId or null. Designed to be called only AFTER a cheap deterministic check
 * has failed — the candidate list should be small (≤ ~20) so this stays cheap.
 */
export async function findMatchingAudit(
  restaurantName: string,
  postcode: string,
  candidates: DedupeCandidate[],
): Promise<DedupeMatch> {
  if (candidates.length === 0) {
    return { matchedRunId: null, confidence: "high", reasoning: "No candidates provided." }
  }

  const candidatesBlock = candidates
    .map(
      (c, i) =>
        `${i + 1}. runId="${c.runId}" | name="${c.restaurantName}" | address/postcode="${c.postcode}" | auditedAt=${c.createdAt}`,
    )
    .join("\n")

  const prompt = `A user just requested a presence audit for this restaurant:

  Name:    "${restaurantName}"
  Postcode/address: "${postcode}"

We already have these recent audits in the database:

${candidatesBlock}

Your job: decide whether the user's restaurant is the SAME as any one of the candidates above.

Rules:
- Match a candidate if the name and the location both clearly refer to the same physical restaurant. Names may be abbreviated (e.g. "BRAT" vs "BRAT Restaurant"), differently cased, or have suffixes like "Restaurant", "Pub", "Cafe", "Bistro", "Kitchen" added/removed.
- The user may type only a postcode (e.g. "E1 6JL") while the candidate stores a full address (e.g. "4 Redchurch St, London E1 6JL"). They match if the postcode appears in the stored address.
- Two restaurants with similar names but clearly different postcodes/addresses are NOT a match.
- If unsure, return null. False positives are worse than false negatives.

Return the runId of the matching candidate, or null.`

  const { experimental_output } = await generateText({
    model: "anthropic/claude-sonnet-4.6",
    prompt,
    experimental_output: Output.object({ schema: DedupeSchema }),
  })

  return experimental_output as DedupeMatch
}
