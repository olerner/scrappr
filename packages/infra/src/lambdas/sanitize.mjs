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

/** Sanitize user-provided listing fields before writing to the database. */
export function sanitizeListing({ category, description, address, photoUrl, ...rest }) {
  return {
    ...rest,
    ...(category !== undefined && { category: escapeHtml(category) }),
    ...(description !== undefined && { description: escapeHtml(description) }),
    ...(address !== undefined && { address: escapeHtml(address) }),
    // Validate photoUrl is a real https URL; reject anything else to prevent injection
    ...(photoUrl !== undefined && { photoUrl: sanitizePhotoUrl(photoUrl) }),
  };
}

/** Sanitize user-provided address book fields. */
export function sanitizeAddress({ label, address, ...rest }) {
  return {
    ...rest,
    ...(label !== undefined && { label: escapeHtml(label) }),
    ...(address !== undefined && { address: escapeHtml(address) }),
  };
}

/**
 * Validate that a photoUrl is a well-formed https URL.
 * Returns the URL if valid, or an empty string if not.
 * This prevents injection of arbitrary strings into HTML email templates.
 */
export function sanitizePhotoUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(String(url));
    if (parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}
