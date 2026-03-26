import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getUserId } from "./auth.mjs";
import { notifyScrappee } from "./email.mjs";
import { createLogger } from "./logger.mjs";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.LISTINGS_TABLE;
const LISTING_ID_INDEX = process.env.LISTING_ID_INDEX;

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

    // Look up listing by ID
    const queryResult = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: LISTING_ID_INDEX,
        KeyConditionExpression: "listingId = :lid",
        ExpressionAttributeValues: { ":lid": listingId },
        Limit: 1,
      })
    );

    const listing = queryResult.Items?.[0];
    if (!listing) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Listing not found" }),
      };
    }

    // Only the hauler who claimed it can unclaim
    if (listing.claimedBy !== userId) {
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Only the hauler who claimed this listing can unclaim it" }),
      };
    }

    // Set status back to available, remove claim fields
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { userId: listing.userId, listingId },
          UpdateExpression: "SET #status = :available REMOVE claimedBy, claimedAt",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":available": "available",
            ":claimed": "claimed",
          },
          ConditionExpression: "#status = :claimed",
        })
      );
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        return {
          statusCode: 409,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Listing is not in claimed status" }),
        };
      }
      throw err;
    }

    notifyScrappee({
      ownerUserId: listing.userId,
      subject: "Your listing is available again",
      heading: "Listing back on the market",
      message: "The hauler who claimed your listing wasn't able to make the pickup, so your listing is back on the market. No action needed from you — other haulers in the area can now see and claim it.",
      listing,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Listing unclaimed successfully" }),
    };
  } catch (err) {
    log.error("unclaim-listing failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
