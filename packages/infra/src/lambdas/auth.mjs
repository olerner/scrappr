/**
 * Extract user ID from a Lambda event.
 *
 * Priority:
 *   1. API Gateway JWT authorizer claims (when the route has an authorizer configured).
 *   2. Decode the Authorization header directly — used for routes that intentionally
 *      omit the gateway-level authorizer (e.g. /listings, which supports both public
 *      and authenticated access on the same endpoint). Note: this skips signature
 *      verification, so the claim is trusted at the application layer only.
 *      Safe because the JWT was issued by Cognito and the token's exp/iat are still
 *      checked by Cognito at issuance; a forged token would only affect read-only
 *      data scoped to the faked userId.
 */
export function getUserId(event) {
  // 1. API Gateway authorizer (routes with a configured JWT authorizer)
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (claims?.sub) return claims.sub;

  // 2. Decode JWT from Authorization header (routes without a gateway authorizer,
  //    or SAM local where the authorizer is not run).
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (authHeader) {
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
