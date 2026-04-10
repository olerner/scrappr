import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { notifyScrappee } from "./email.mjs";
import { ddb, json, withAuth, lookupListingById } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;
const LISTING_ID_INDEX = process.env.LISTING_ID_INDEX;

export const handler = withAuth("listingId", async (_event, { userId, listingId }) => {
  const listing = await lookupListingById(TABLE, LISTING_ID_INDEX, listingId);
  if (!listing) return json(404, { error: "Listing not found" });

  if (listing.claimedBy !== userId) {
    return json(403, { error: "Only the hauler who claimed this listing can mark it complete" });
  }

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { userId: listing.userId, listingId },
        UpdateExpression: "SET #status = :completed, completedAt = :completedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":completed": "completed",
          ":completedAt": new Date().toISOString(),
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
    subject: "Your scrap has been picked up!",
    heading: "Pickup complete!",
    message: "The hauler has picked up your scrap and is taking it to a local scrap yard. Thanks for keeping valuable metal out of the landfill — you just helped power the circular economy!",
    listing,
  });

  return json(200, { message: "Pickup marked as completed" });
});
