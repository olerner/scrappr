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

    if (listing.claimedBy !== userId) {
      return json(403, { error: "Only the hauler who claimed this listing can unclaim it" });
    }

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
        return json(409, { error: "Listing is not in claimed status" });
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

    return json(200, { message: "Listing unclaimed successfully" });
  } catch (err) {
    log.error("unclaim-listing failed", err);
    return json(500, { error: "Internal server error" });
  }
};
