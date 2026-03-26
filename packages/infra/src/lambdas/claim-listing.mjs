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

    // Look up the listing by listingId using the GSI
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

    // Prevent claiming your own listing
    if (listing.userId === userId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "You cannot claim your own listing" }),
      };
    }

    // Atomically update status to "claimed" only if currently "available"
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { userId: listing.userId, listingId },
          UpdateExpression: "SET #status = :claimed, claimedBy = :claimedBy, claimedAt = :claimedAt",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":claimed": "claimed",
            ":claimedBy": userId,
            ":claimedAt": new Date().toISOString(),
            ":available": "available",
          },
          ConditionExpression: "#status = :available",
        })
      );
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        return {
          statusCode: 409,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "This listing has already been claimed" }),
        };
      }
      throw err;
    }

    // Notify the scrappee (non-blocking)
    notifyScrappee({
      ownerUserId: listing.userId,
      subject: "A hauler is coming to pick up your scrap!",
      heading: "A hauler is on the way!",
      message: "A local hauler has claimed your listing and plans to pick it up within 24 hours. Make sure your scrap is accessible and easy to find — near the curb, by the garage, or wherever you noted in your listing.",
      listing,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Listing claimed successfully" }),
    };
  } catch (err) {
    log.error("claim-listing failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
