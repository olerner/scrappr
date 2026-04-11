import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json } from "./lambda-utils.mjs";
import { createLogger } from "./logger.mjs";

const TABLE = process.env.LISTINGS_TABLE;
const STATUS_INDEX = "status-index";

/**
 * Public browse endpoint — lists available listings with street address redacted.
 * Unauthenticated, so it can't use withAuth.
 */
export const handler = async (event) => {
  const log = createLogger(event);
  try {
    const category = event.queryStringParameters?.category;
    const cursor = event.queryStringParameters?.cursor;
    const PAGE_SIZE = 20;

    const queryParams = {
      TableName: TABLE,
      IndexName: STATUS_INDEX,
      KeyConditionExpression: "#status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": "available" },
      ScanIndexForward: false,
      Limit: PAGE_SIZE,
    };

    if (category) {
      queryParams.FilterExpression = "category = :cat";
      queryParams.ExpressionAttributeValues[":cat"] = category;
    }

    if (cursor) {
      try {
        queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(cursor, "base64url").toString());
      } catch {
        // Invalid cursor, ignore
      }
    }

    const result = await ddb.send(new QueryCommand(queryParams));

    // Strip `userId` and `phone` — both are revealed only after the hauler claims.
    // `sharePhone` is kept so the UI can (optionally) hint that a phone is available.
    const listings = (result.Items || []).map(({ userId: _ownerId, phone: _phone, ...item }) => ({
      ...item,
      address: redactAddress(item.address),
    }));

    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64url")
      : null;

    return json(200, { listings, nextCursor });
  } catch (err) {
    log.error("get-listings failed", err);
    return json(500, { error: "Internal server error" });
  }
};

/** Strip street address, keep only city/state. */
function redactAddress(address) {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 3) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1].replace(/\d{5}(-\d{4})?/, "").trim()}`;
  }
  if (parts.length === 2) {
    return parts[1].replace(/\d{5}(-\d{4})?/, "").trim();
  }
  return "Twin Cities area";
}
