/**
 * Extract user ID from a Lambda event.
 *
 * Priority:
 *   1. API Gateway JWT authorizer claims (when the route has an authorizer configured).
 *   2. SAM local fallback: decode the Authorization header directly (no signature
 *      verification). In deployed environments, every route that needs a userId must
 *      have a gateway-level JWT authorizer — the fallback is disabled and throws.
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
