const SQL_XSS_PATTERNS = [/--/, /;/, /</, />/, /script/i, /SELECT\s/i, /DROP\s/i, /INSERT\s/i, /UPDATE\s/i]

const PROMPT_INJECTION_PATTERNS = [
  /ignore previous/i,
  /system:/i,
  /assistant:/i,
  /human:/i,
  /\n\nUser/,
  /<\|im_start\|>/,
  /INST\]/,
  /###/,
]

export function validateInputs(
  restaurantName: string,
  postcode: string,
): { valid: true } | { valid: false; field: "restaurantName" | "postcode"; message: string } {
  const trimmedName = restaurantName.trim()

  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return {
      valid: false,
      field: "restaurantName",
      message: "Restaurant name must be between 2 and 100 characters",
    }
  }

  if (!/^[\p{L}0-9 '\-&.()/]+$/u.test(trimmedName)) {
    return {
      valid: false,
      field: "restaurantName",
      message: "Restaurant name contains invalid characters",
    }
  }

  for (const pattern of SQL_XSS_PATTERNS) {
    if (pattern.test(trimmedName)) {
      return {
        valid: false,
        field: "restaurantName",
        message: "Restaurant name contains invalid characters",
      }
    }
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(trimmedName)) {
      return {
        valid: false,
        field: "restaurantName",
        message: "Restaurant name contains invalid characters",
      }
    }
  }

  const trimmedPostcode = postcode.trim()
  const postcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i

  if (!postcodeRegex.test(trimmedPostcode)) {
    return {
      valid: false,
      field: "postcode",
      message: "Please enter a valid London postcode (e.g. EC2A 3JL)",
    }
  }

  const normalised = trimmedPostcode.toUpperCase()
  const londonPrefixes = [
    "EC", "WC", "NW", "SE", "SW", "BR", "CR", "DA", "EN", "HA",
    "IG", "KT", "RM", "SM", "TW", "UB", "WD", "E", "N", "W",
  ]
  const outward = normalised.split(/\s/)[0]
  const hasLondonPrefix = londonPrefixes.some((prefix) => outward.startsWith(prefix))

  if (!hasLondonPrefix) {
    return {
      valid: false,
      field: "postcode",
      message: "Please enter a valid London postcode (e.g. EC2A 3JL)",
    }
  }

  return { valid: true }
}
