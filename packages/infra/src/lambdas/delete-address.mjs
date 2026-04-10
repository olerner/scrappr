import { DeleteCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, withAuth } from "./lambda-utils.mjs";

const TABLE = process.env.ADDRESSES_TABLE;

export const handler = withAuth("addressId", async (_event, { userId, addressId }) => {
  let result;
  try {
    result = await ddb.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { userId, addressId },
        ConditionExpression: "attribute_exists(addressId)",
        ReturnValues: "ALL_OLD",
      }),
    );
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return json(404, { error: "Address not found" });
    }
    throw err;
  }

  // If deleted address was default, promote the oldest remaining
  if (result.Attributes?.isDefault) {
    const remaining = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ScanIndexForward: true,
        Limit: 1,
      }),
    );
    const next = remaining.Items?.[0];
    if (next) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { userId, addressId: next.addressId },
          UpdateExpression: "SET isDefault = :t",
          ExpressionAttributeValues: { ":t": true },
        }),
      );
    }
  }

  return json(200, { message: "Address deleted" });
});
