import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, withAuth } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;

export const handler = withAuth("listingId", async (_event, { userId, listingId }) => {
  try {
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
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return json(409, { error: "Listing not found or cannot be deleted (it may have been claimed)" });
    }
    throw err;
  }

  return json(200, { message: "Listing deleted" });
});
