/**
 * Normalisation helpers used to de-duplicate audit runs.
 *
 * The user can submit "BRAT" / "E1 6JL" while the workflow may store
 * "BRAT Restaurant" / "4 Redchurch St, London E1 6JL". These helpers strip
 * everything that's noise so we can match them as the same place.
 */

// Outward part is mandatory ("SE1", "E1", "WC2N"); inward part ("8HA") is optional.
// Greedy matching means a full postcode is still preferred when present, so
// "London E1 6JL" → "E1 6JL" but "venues near SE1" → "SE1".
const UK_POSTCODE_RE = /[A-Z]{1,2}[0-9][A-Z0-9]?(?:\s*[0-9][A-Z]{2})?/i

// Words we strip from restaurant names before comparing. These rarely change
// the identity of a place ("Brat" vs "Brat Restaurant" is the same venue).
const NAME_STOPWORDS = [
  "restaurant",
  "restaurants",
  "pub",
  "pubs",
  "cafe",
  "cafes",
  "café",
  "cafés",
  "bar",
  "bistro",
  "kitchen",
  "the",
  "and",
]

/**
 * Extracts the UK postcode from a free-form string and returns it without
 * spaces and uppercased. Returns null if no postcode pattern is found.
 *
 * Examples:
 *   "E1 6JL"                              -> "E16JL"
 *   "e1  6jl"                             -> "E16JL"
 *   "4 Redchurch St, London E1 6JL"       -> "E16JL"
 *   "no postcode here"                    -> null
 */
export function normalizePostcode(input: string | null | undefined): string | null {
  if (!input) return null
  const match = input.match(UK_POSTCODE_RE)
  if (!match) return null
  return match[0].replace(/\s+/g, "").toUpperCase()
}

/**
 * Normalises a restaurant name for fuzzy matching: lowercase, strip common
 * generic words, and remove all non-alphanumeric characters.
 *
 * Examples:
 *   "BRAT"             -> "brat"
 *   "BRAT Restaurant"  -> "brat"
 *   "The Brat & Pub"   -> "brat"
 */
export function normalizeName(input: string | null | undefined): string {
  if (!input) return ""
  const stopwordRe = new RegExp(`\\b(${NAME_STOPWORDS.join("|")})\\b`, "gi")
  return input
    .toLowerCase()
    .replace(stopwordRe, "")
    .replace(/[^a-z0-9]/g, "")
    .trim()
}

/**
 * Returns true if two normalized names are likely the same restaurant.
 * Uses substring containment in either direction — so "brat" matches
 * "bratrestaurant" and "brawn" matches "brawnpub".
 */
export function nameMatches(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  return a.includes(b) || b.includes(a)
}
