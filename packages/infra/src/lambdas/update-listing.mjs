import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { sanitizeListing } from "./sanitize.mjs";
import { ddb, json, parseRequest, buildUpdateExpression, validateZip } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;

const ALLOWED_FIELDS = ["category", "description", "photoUrl", "lat", "lng", "address", "zipCode", "estimatedValue"];

export const handler = async (event) => {
  const req = parseRequest(event, "listingId");
  if (req.response) return req.response;
  const { userId, listingId, log } = req;

  try {
    const body = JSON.parse(event.body || "{}");

    const raw = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        raw[field] = body[field];
      }
    }
    let updates;
    try {
      updates = sanitizeListing(raw);
    } catch (err) {
      return json(400, { error: err.message });
    }

    if (Object.keys(updates).length === 0) {
      return json(400, { error: "No valid fields to update" });
    }

    if (updates.zipCode) {
      const zipErr = validateZip(updates.zipCode);
      if (zipErr) return zipErr;
    }

    const expr = buildUpdateExpression(updates);

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { userId, listingId },
        ...expr,
        ExpressionAttributeValues: {
          ...expr.ExpressionAttributeValues,
          ":available": "available",
        },
        ExpressionAttributeNames: {
          ...expr.ExpressionAttributeNames,
          "#status": "status",
        },
        ConditionExpression: "attribute_exists(listingId) AND #status = :available",
        ReturnValues: "ALL_NEW",
      })
    );

    return json(200, { message: "Listing updated" });
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return json(409, { error: "Listing not found or cannot be edited (it may have been claimed)" });
    }
    log.error("update-listing failed", err);
    return json(500, { error: "Internal server error" });
  }
};
