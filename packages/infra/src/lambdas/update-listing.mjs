import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { sanitizeListing } from "./sanitize.mjs";
import { ddb, json, withAuth, buildUpdateExpression, validateZip } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;

const ALLOWED_FIELDS = [
  "category",
  "description",
  "photoUrl",
  "lat",
  "lng",
  "address",
  "zipCode",
  "estimatedValue",
  "sharePhone",
  "phone",
];

export const handler = withAuth("listingId", async (event, { userId, listingId }) => {
  const body = JSON.parse(event.body || "{}");

  const raw = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      raw[field] = body[field];
    }
  }
  // If the user is toggling phone sharing off, clear the stored phone server-side
  // even if the client didn't include `phone` in the patch body.
  if (raw.sharePhone === false) {
    raw.phone = "";
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

  try {
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
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return json(409, { error: "Listing not found or cannot be edited (it may have been claimed)" });
    }
    throw err;
  }

  return json(200, { message: "Listing updated" });
});
