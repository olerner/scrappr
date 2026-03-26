import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getUserId } from "./auth.mjs";
import { createLogger } from "./logger.mjs";
import { sanitizeListing } from "./sanitize.mjs";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.LISTINGS_TABLE;

const ALLOWED_FIELDS = ["category", "description", "photoUrl", "lat", "lng", "address", "zipCode", "estimatedValue"];

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

    const listingId = event.pathParameters?.listingId;
    if (!listingId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "listingId is required" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    // Only allow updating specific fields, sanitize user input
    const raw = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        raw[field] = body[field];
      }
    }
    const updates = sanitizeListing(raw);

    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No valid fields to update" }),
      };
    }

    // Validate zip code if being updated
    const ALLOWED_ZIPS = ["55426", "55416"];
    if (updates.zipCode && !ALLOWED_ZIPS.includes(updates.zipCode.trim())) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Scrappr is currently only available in St. Louis Park, MN. Listings outside this area cannot be created at this time.",
        }),
      };
    }

    // Build UpdateExpression dynamically
    const expressionParts = [];
    const expressionValues = {};
    const expressionNames = {};

    for (const [key, value] of Object.entries(updates)) {
      expressionParts.push(`#${key} = :${key}`);
      expressionValues[`:${key}`] = key === "zipCode" ? value.trim() : value;
      expressionNames[`#${key}`] = key;
    }

    // Add updatedAt timestamp
    expressionParts.push("#updatedAt = :updatedAt");
    expressionValues[":updatedAt"] = new Date().toISOString();
    expressionNames["#updatedAt"] = "updatedAt";

    // Condition: listing must exist and belong to this user, and must still be available
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { userId, listingId },
        UpdateExpression: `SET ${expressionParts.join(", ")}`,
        ExpressionAttributeValues: {
          ...expressionValues,
          ":available": "available",
        },
        ExpressionAttributeNames: {
          ...expressionNames,
          "#status": "status",
        },
        ConditionExpression: "attribute_exists(listingId) AND #status = :available",
        ReturnValues: "ALL_NEW",
      })
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Listing updated" }),
    };
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 409,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Listing not found or cannot be edited (it may have been claimed)" }),
      };
    }
    log.error("update-listing failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
