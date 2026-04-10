import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { ddb, json, withAuth, validateZip } from "./lambda-utils.mjs";

const TABLE = process.env.ADDRESSES_TABLE;

export const handler = withAuth(async (event, { userId }) => {
  const body = JSON.parse(event.body || "{}");
  const { label, address, lat, lng, zipCode } = body;

  if (!address || lat == null || lng == null || !zipCode) {
    return json(400, { error: "address, lat, lng, and zipCode are required" });
  }

  const zipErr = validateZip(zipCode);
  if (zipErr) return zipErr;

  // Check existing addresses to determine default
  const existing = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
      Select: "COUNT",
    }),
  );

  const isFirst = existing.Count === 0;
  const isDefault = isFirst || body.isDefault === true;

  // If marking as default and not first, unset the current default
  if (isDefault && !isFirst) {
    const allAddresses = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
      }),
    );
    const currentDefault = (allAddresses.Items || []).find((a) => a.isDefault);
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

  const addressId = randomUUID();
  const item = {
    userId,
    addressId,
    label: label || "",
    address,
    lat,
    lng,
    zipCode: zipCode.trim(),
    isDefault,
    createdAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

  return json(201, item);
});
