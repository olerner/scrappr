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
export function sanitizeListing({ category, description, address, ...rest }) {
  return {
    ...rest,
    ...(category !== undefined && { category: escapeHtml(category) }),
    ...(description !== undefined && { description: escapeHtml(description) }),
    ...(address !== undefined && { address: escapeHtml(address) }),
  };
}
