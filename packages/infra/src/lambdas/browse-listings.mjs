import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserId } from "./auth.mjs";
import { createLogger } from "./logger.mjs";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.LISTINGS_TABLE;
const STATUS_INDEX = process.env.STATUS_INDEX;

export const handler = async (event) => {
  const log = createLogger(event);
  try {
    const userId = getUserId(event);
    if (!userId) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const category = event.queryStringParameters?.category;

    const queryParams = {
      TableName: TABLE,
      IndexName: STATUS_INDEX,
      KeyConditionExpression: "#status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": "available" },
      ScanIndexForward: false, // newest first
    };

    if (category) {
      queryParams.FilterExpression = "category = :cat";
      queryParams.ExpressionAttributeValues[":cat"] = category;
    }

    const result = await ddb.send(new QueryCommand(queryParams));

    // Exclude user's own listings and strip sensitive fields
    const listings = (result.Items || [])
      .filter((item) => item.userId !== userId)
      .map(({ userId: _ownerId, ...item }) => ({
        ...item,
        address: redactAddress(item.address),
      }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listings }),
    };
  } catch (err) {
    log.error("browse-listings failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
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
