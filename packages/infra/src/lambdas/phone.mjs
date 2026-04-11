// Canonical phone number validation + normalization.
//
// This module is the single source of truth for phone handling across the
// whole codebase. It lives inside packages/infra/src/lambdas/ so it can be
// shipped as-is by `lambda.Code.fromAsset`, and is re-exported from
// packages/shared/src/types.ts for the UI.
//
// Keep as plain ESM JS (no TypeScript) so it runs in Node 20 without a build
// step. Type information comes from the sibling phone.d.mts.

/**
 * Returns true if the input can be normalized to a valid 10-digit US phone.
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith("1")) return true;
  return false;
}

/**
 * Normalize any supported US format to E.164 `+1XXXXXXXXXX`. Throws if invalid.
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhone(phone) {
  if (!phone) throw new Error("Invalid phone number");
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw new Error("Invalid phone number");
}

/**
 * Format E.164 `+1XXXXXXXXXX` as `(XXX) XXX-XXXX` for display.
 * Returns the input unchanged if it can't be parsed.
 * @param {string} phone
 * @returns {string}
 */
export function formatPhoneForDisplay(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return phone;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}
