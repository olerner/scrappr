import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getUserId } from "./auth.mjs";
import { createLogger } from "./logger.mjs";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.LISTINGS_TABLE;

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

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { userId, listingId },
        UpdateExpression: "SET isDeleted = :true, deletedAt = :now, #status = :deleted",
        ExpressionAttributeValues: {
          ":true": true,
          ":now": new Date().toISOString(),
          ":deleted": "deleted",
          ":available": "available",
        },
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ConditionExpression: "attribute_exists(listingId) AND #status = :available",
      })
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Listing deleted" }),
    };
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 409,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Listing not found or cannot be deleted (it may have been claimed)" }),
      };
    }
    log.error("delete-listing failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
