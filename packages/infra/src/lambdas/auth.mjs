/**
 * Extract user ID from a Lambda event.
 *
 * In production, API Gateway populates event.requestContext.authorizer.jwt.claims.
 * SAM local doesn't run the JWT authorizer, so we fall back to decoding the
 * Authorization header directly (no verification — safe for local dev only).
 */
export function getUserId(event) {
  // 1. API Gateway authorizer (production)
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (claims?.sub) return claims.sub;

  // 2. Decode JWT from Authorization header (SAM local)
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (authHeader) {
    try {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const payload = token.split(".")[1];
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
      if (decoded.sub) return decoded.sub;
    } catch {
      // invalid token
    }
  }

  return null;
}
