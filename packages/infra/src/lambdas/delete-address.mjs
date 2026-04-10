import { DeleteCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, parseRequest } from "./lambda-utils.mjs";

const TABLE = process.env.ADDRESSES_TABLE;

export const handler = async (event) => {
  const req = parseRequest(event, "addressId");
  if (req.response) return req.response;
  const { userId, addressId, log } = req;

  try {
    const result = await ddb.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { userId, addressId },
        ConditionExpression: "attribute_exists(addressId)",
        ReturnValues: "ALL_OLD",
      }),
    );

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
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return json(404, { error: "Address not found" });
    }
    log.error("delete-address failed", err);
    return json(500, { error: "Internal server error" });
  }
};
