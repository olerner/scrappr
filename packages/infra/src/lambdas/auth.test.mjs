import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getUserId } from "./auth.mjs";

function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fake-signature`;
}

describe("getUserId", () => {
  beforeEach(() => {
    delete process.env.AWS_SAM_LOCAL;
  });

  it("returns sub from API Gateway authorizer claims", () => {
    const event = {
      requestContext: { authorizer: { jwt: { claims: { sub: "user-123" } } } },
    };
    assert.equal(getUserId(event), "user-123");
  });

  it("returns sub from Authorization header JWT (SAM local)", () => {
    process.env.AWS_SAM_LOCAL = "true";
    const event = {
      requestContext: {},
      headers: { authorization: `Bearer ${makeJwt({ sub: "user-456" })}` },
    };
    assert.equal(getUserId(event), "user-456");
  });

  it("handles Authorization header without Bearer prefix", () => {
    process.env.AWS_SAM_LOCAL = "true";
    const event = {
      requestContext: {},
      headers: { authorization: makeJwt({ sub: "user-789" }) },
    };
    assert.equal(getUserId(event), "user-789");
  });

  it("handles capitalized Authorization header", () => {
    process.env.AWS_SAM_LOCAL = "true";
    const event = {
      requestContext: {},
      headers: { Authorization: `Bearer ${makeJwt({ sub: "user-abc" })}` },
    };
    assert.equal(getUserId(event), "user-abc");
  });

  it("prefers API Gateway claims over Authorization header", () => {
    process.env.AWS_SAM_LOCAL = "true";
    const event = {
      requestContext: { authorizer: { jwt: { claims: { sub: "from-gw" } } } },
      headers: { authorization: `Bearer ${makeJwt({ sub: "from-header" })}` },
    };
    assert.equal(getUserId(event), "from-gw");
  });

  it("returns null when no auth info is present", () => {
    assert.equal(getUserId({ requestContext: {} }), null);
  });

  it("returns null for empty event", () => {
    assert.equal(getUserId({}), null);
  });

  it("returns null for malformed JWT (not valid base64)", () => {
    process.env.AWS_SAM_LOCAL = "true";
    const event = {
      requestContext: {},
      headers: { authorization: "Bearer not.valid-base64.token" },
    };
    assert.equal(getUserId(event), null);
  });

  it("returns null for JWT missing sub claim", () => {
    process.env.AWS_SAM_LOCAL = "true";
    const event = {
      requestContext: {},
      headers: { authorization: `Bearer ${makeJwt({ email: "test@example.com" })}` },
    };
    assert.equal(getUserId(event), null);
  });

  it("returns null for token with no dots", () => {
    process.env.AWS_SAM_LOCAL = "true";
    const event = {
      requestContext: {},
      headers: { authorization: "Bearer nodots" },
    };
    assert.equal(getUserId(event), null);
  });

  it("throws if JWT fallback is hit outside SAM local", () => {
    delete process.env.AWS_SAM_LOCAL;
    const event = {
      requestContext: {},
      headers: { authorization: `Bearer ${makeJwt({ sub: "user-123" })}` },
    };
    assert.throws(() => getUserId(event), {
      message: /API Gateway authorizer claims missing in deployed environment/,
    });
  });
});
