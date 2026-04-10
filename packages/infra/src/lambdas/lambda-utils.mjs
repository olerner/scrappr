import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserId } from "./auth.mjs";
import { createLogger } from "./logger.mjs";

// ── DynamoDB client ──────────────────────────────────────────────────────

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client);

// ── JSON response helper ─────────────────────────────────────────────────

const JSON_HEADERS = { "Content-Type": "application/json" };

export function json(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

// ── Auth + path param guards ─────────────────────────────────────────────

/**
 * Returns { userId, log } or an early HTTP response if auth/param checks fail.
 * Callers should check `result.statusCode` to detect an early return.
 */
export function parseRequest(event, pathParam) {
  const log = createLogger(event);
  const userId = getUserId(event);
  if (!userId) {
    return { response: json(401, { error: "Unauthorized" }), log };
  }

  if (pathParam) {
    const value = event.pathParameters?.[pathParam];
    if (!value) {
      return { response: json(400, { error: `${pathParam} is required` }), log };
    }
    return { userId, [pathParam]: value, log };
  }

  return { userId, log };
}

// ── Listing GSI lookup ───────────────────────────────────────────────────

export async function lookupListingById(table, index, listingId) {
  const queryResult = await ddb.send(
    new QueryCommand({
      TableName: table,
      IndexName: index,
      KeyConditionExpression: "listingId = :lid",
      ExpressionAttributeValues: { ":lid": listingId },
      Limit: 1,
    }),
  );
  return queryResult.Items?.[0] ?? null;
}

// ── Dynamic UpdateExpression builder ─────────────────────────────────────

export function buildUpdateExpression(updates) {
  const parts = [];
  const values = {};
  const names = {};

  for (const [key, value] of Object.entries(updates)) {
    parts.push(`#${key} = :${key}`);
    values[`:${key}`] = key === "zipCode" && typeof value === "string" ? value.trim() : value;
    names[`#${key}`] = key;
  }

  // Always add updatedAt
  parts.push("#updatedAt = :updatedAt");
  values[":updatedAt"] = new Date().toISOString();
  names["#updatedAt"] = "updatedAt";

  return {
    UpdateExpression: `SET ${parts.join(", ")}`,
    ExpressionAttributeValues: values,
    ExpressionAttributeNames: names,
  };
}

// ── Zip validation ───────────────────────────────────────────────────────

const ALLOWED_ZIPS = ["55426", "55416"];

export function validateZip(zipCode) {
  if (!zipCode || !ALLOWED_ZIPS.includes(zipCode.trim())) {
    return json(400, {
      error:
        "Scrappr is currently only available in St. Louis Park, MN. Listings outside this area cannot be created at this time.",
    });
  }
  return null;
}
