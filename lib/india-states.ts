/** All 28 states + 8 union territories of India, as returned by India Post's pincode API. */
export const INDIA_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

/**
 * India Post's pincode API sometimes returns older/alternate state names.
 * Map those to the canonical names above so the dropdown selection matches.
 */
const STATE_ALIASES: Record<string, string> = {
  "nct of delhi": "Delhi",
  orissa: "Odisha",
  pondicherry: "Puducherry",
  uttaranchal: "Uttarakhand",
};

/** Resolve an India Post state string to one of INDIA_STATES, or null if no match. */
export function normalizeIndiaState(raw: string): string | null {
  const trimmed = raw.trim();
  const alias = STATE_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  const match = INDIA_STATES.find(
    (s) => s.toLowerCase() === trimmed.toLowerCase()
  );
  return match ?? null;
}
