import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, parseRequest } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;

export const handler = async (event) => {
  const req = parseRequest(event, "listingId");
  if (req.response) return req.response;
  const { userId, listingId, log } = req;

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

    return json(200, { message: "Listing deleted" });
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return json(409, { error: "Listing not found or cannot be deleted (it may have been claimed)" });
    }
    log.error("delete-listing failed", err);
    return json(500, { error: "Internal server error" });
  }
};
