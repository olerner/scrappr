import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, parseRequest } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;
const STATUS_INDEX = process.env.STATUS_INDEX;

export const handler = async (event) => {
  const req = parseRequest(event);
  if (req.response) return req.response;
  const { userId, log } = req;

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
      ScanIndexForward: false, // newest first
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

    // Exclude user's own listings and strip sensitive fields
    const listings = (result.Items || [])
      .filter((item) => item.userId !== userId)
      .map(({ userId: _ownerId, ...item }) => ({
        ...item,
        address: redactAddress(item.address),
      }));

    // Encode next cursor for pagination
    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64url")
      : null;

    return json(200, { listings, nextCursor });
  } catch (err) {
    log.error("browse-listings failed", err);
    return json(500, { error: "Internal server error" });
  }
};

/** Strip street address, keep only city/state. */
function redactAddress(address) {
  if (!address) return "";
  // Addresses typically look like "1234 Main St, St. Louis Park, MN 55426"
  // We want to return just "St. Louis Park, MN"
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 3) {
    // Remove street (first part) and zip from state
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1].replace(/\d{5}(-\d{4})?/, "").trim()}`;
  }
  if (parts.length === 2) {
    return parts[1].replace(/\d{5}(-\d{4})?/, "").trim();
  }
  return "Twin Cities area";
}
