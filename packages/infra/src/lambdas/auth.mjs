/**
 * Extract user ID from a Lambda event.
 *
 * When running behind API Gateway (deployed environments), claims are populated
 * via event.requestContext.authorizer.jwt.claims.
 * SAM local doesn't run the JWT authorizer, so we fall back to decoding the
 * Authorization header directly (no verification — safe for local dev only).
 */
export function getUserId(event) {
  // 1. API Gateway authorizer (deployed environments)
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (claims?.sub) return claims.sub;

  // 2. Decode JWT from Authorization header (SAM local fallback only)
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (authHeader) {
    if (!process.env.AWS_SAM_LOCAL) {
      throw new Error("[auth] API Gateway authorizer claims missing in deployed environment. Check that the route has a JWT authorizer configured.");
    }
    try {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const payload = token.split(".")[1];
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
      if (decoded.sub) return decoded.sub;
    } catch (err) {
      console.warn("[auth] Failed to decode JWT from Authorization header:", err.message);
    }
  }

  return null;
}
