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
  if (!url || typeof url !== "string") return "";
  if (bucketUrl && !url.startsWith(`${bucketUrl}/`)) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

/** Sanitize user-provided listing fields before writing to the database. */
export function sanitizeListing({ category, description, address, photoUrl, ...rest }) {
  return {
    ...rest,
    ...(category !== undefined && { category: escapeHtml(category) }),
    ...(description !== undefined && { description: escapeHtml(description) }),
    ...(address !== undefined && { address: escapeHtml(address) }),
    ...(photoUrl !== undefined && { photoUrl: sanitizePhotoUrl(photoUrl) }),
  };
}
