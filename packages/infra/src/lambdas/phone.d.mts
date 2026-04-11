/** Returns true if the input can be normalized to a valid 10-digit US phone. */
export function isValidPhone(phone: string): boolean;

/** Normalize any supported US format to E.164 `+1XXXXXXXXXX`. Throws if invalid. */
export function normalizePhone(phone: string): string;

/** Format E.164 `+1XXXXXXXXXX` as `(XXX) XXX-XXXX` for display. */
export function formatPhoneForDisplay(phone: string): string;
