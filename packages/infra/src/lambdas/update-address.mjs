import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, withAuth, buildUpdateExpression, validateZip } from "./lambda-utils.mjs";

const TABLE = process.env.ADDRESSES_TABLE;

const ALLOWED_FIELDS = ["label", "address", "lat", "lng", "zipCode", "isDefault"];

export const handler = withAuth("addressId", async (event, { userId, addressId }) => {
  const body = JSON.parse(event.body || "{}");

  const updates = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return json(400, { error: "No valid fields to update" });
  }

  if (updates.zipCode) {
    const zipErr = validateZip(updates.zipCode);
    if (zipErr) return zipErr;
  }

  // If setting as default, unset the current default first
  if (updates.isDefault === true) {
    const allAddresses = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
      }),
    );
    const currentDefault = (allAddresses.Items || []).find(
      (a) => a.isDefault && a.addressId !== addressId,
    );
    if (currentDefault) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { userId, addressId: currentDefault.addressId },
          UpdateExpression: "SET isDefault = :f",
          ExpressionAttributeValues: { ":f": false },
        }),
      );
    }
  }

  const expr = buildUpdateExpression(updates);

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { userId, addressId },
        ...expr,
        ExpressionAttributeValues: expr.ExpressionAttributeValues,
        ExpressionAttributeNames: expr.ExpressionAttributeNames,
        ConditionExpression: "attribute_exists(addressId)",
        ReturnValues: "ALL_NEW",
      }),
    );
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return json(404, { error: "Address not found" });
    }
    throw err;
  }

  return json(200, { message: "Address updated" });
});
