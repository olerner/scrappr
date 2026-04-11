import { normalizePhone } from "./phone.mjs";

/** Escape HTML special characters to prevent XSS when user input is rendered. */
export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Validate a photo URL — must be a well-formed URL under our photo bucket origin. */
function sanitizePhotoUrl(url) {
  const bucketUrl = process.env.PHOTO_BUCKET_URL;
  if (!bucketUrl) throw new Error("PHOTO_BUCKET_URL environment variable is required");
  if (!url || typeof url !== "string") return "";
  if (!url.startsWith(`${bucketUrl}/`)) {
    throw new Error("Invalid photo URL");
  }
  return url;
}

const DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Normalize a US phone number to E.164 `+1XXXXXXXXXX`. Throws on invalid input.
 * Thin wrapper over the canonical implementation in ./phone.mjs that treats
 * an empty string as "no phone" rather than an error.
 */
export function sanitizePhone(phone) {
  if (!phone) return "";
  return normalizePhone(phone);
}

/** Sanitize user-provided listing fields before writing to the database. */
export function sanitizeListing({
  category,
  description,
  address,
  photoUrl,
  phone,
  sharePhone,
  ...rest
}) {
  if (description !== undefined && typeof description === "string" && description.length > DESCRIPTION_MAX_LENGTH) {
    throw new Error(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`);
  }

  // If user opted out, force phone to empty regardless of what was sent.
  let normalizedPhone;
  if (phone !== undefined) {
    normalizedPhone = sharePhone === false ? "" : sanitizePhone(phone);
  }

  return {
    ...rest,
    ...(category !== undefined && { category: escapeHtml(category) }),
    ...(description !== undefined && { description: escapeHtml(description) }),
    ...(address !== undefined && { address: escapeHtml(address) }),
    ...(photoUrl !== undefined && { photoUrl: sanitizePhotoUrl(photoUrl) }),
    ...(sharePhone !== undefined && { sharePhone: Boolean(sharePhone) }),
    ...(normalizedPhone !== undefined && { phone: normalizedPhone }),
  };
}
