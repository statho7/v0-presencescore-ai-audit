import { generateText, Output } from "ai"
import { z } from "zod"

const ValidationSchema = z.object({
  valid: z.boolean().describe("true if this looks like a plausible real restaurant name"),
  reason: z.string().describe("One short sentence explaining the decision"),
})

export type NameValidation = z.infer<typeof ValidationSchema>

export async function validateRestaurantName(
  restaurantName: string,
  postcode: string,
): Promise<NameValidation> {
  const prompt = `You are a validation agent for a London restaurant audit tool.
The user supplied this input:
  Restaurant name: "${restaurantName}"
  Postcode: "${postcode}"
Decide whether the restaurant name looks like a plausible real restaurant name.
A valid name is something a real London restaurant might actually be called.
Invalid examples: random characters (asdfgh), placeholder text (test, foo, xxx), pure numbers, single letters, repeated words.
Valid examples: Brat, The Clove Club, Smokestak, 10 Greek Street, Dishoom King's Cross, Café Spice Namaste.
Return valid=false only when you are confident this is not a real restaurant name.`

  const { experimental_output } = await generateText({
    model: "anthropic/claude-sonnet-4.6",
    prompt,
    experimental_output: Output.object({ schema: ValidationSchema }),
  })

  return experimental_output as NameValidation
}
