import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { notifyScrappee } from "./email.mjs";
import { ddb, json, parseRequest, lookupListingById } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;
const LISTING_ID_INDEX = process.env.LISTING_ID_INDEX;

export const handler = async (event) => {
  const req = parseRequest(event, "listingId");
  if (req.response) return req.response;
  const { userId, listingId, log } = req;

  try {
    const listing = await lookupListingById(TABLE, LISTING_ID_INDEX, listingId);
    if (!listing) return json(404, { error: "Listing not found" });

    if (listing.userId === userId) {
      return json(400, { error: "You cannot claim your own listing" });
    }

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
        return json(409, { error: "This listing has already been claimed" });
      }
      throw err;
    }

    notifyScrappee({
      ownerUserId: listing.userId,
      subject: "A hauler is coming to pick up your scrap!",
      heading: "A hauler is on the way!",
      message: "A local hauler has claimed your listing and plans to pick it up within 24 hours. Make sure your scrap is accessible and easy to find — near the curb, by the garage, or wherever you noted in your listing.",
      listing,
    });

    return json(200, { message: "Listing claimed successfully" });
  } catch (err) {
    log.error("claim-listing failed", err);
    return json(500, { error: "Internal server error" });
  }
};
