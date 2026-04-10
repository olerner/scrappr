/** How long (in hours) a hauler has to complete a claimed pickup before it expires. */
export const CLAIM_EXPIRY_HOURS = 2;

/** Maximum number of characters allowed in a listing description. */
export const DESCRIPTION_MAX_LENGTH = 1000;

/** Zip codes where Scrappr is currently available (St. Louis Park, MN). */
export const ALLOWED_ZIPS = ["55426", "55416"];

/** Human-readable label for the allowed service area. */
export const ALLOWED_AREA_LABEL = "St. Louis Park, MN";

/** Returns true if the given zip code is within the allowed service area. */
export function isAllowedZip(zip: string): boolean {
  return ALLOWED_ZIPS.includes(zip.trim());
}
