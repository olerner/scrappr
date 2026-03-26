import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { getUserId } from "./auth.mjs";
import { createLogger } from "./logger.mjs";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.ADDRESSES_TABLE;

export const handler = async (event) => {
  const log = createLogger(event);
  try {
    const userId = getUserId(event);
    if (!userId) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const addressId = event.pathParameters?.addressId;
    if (!addressId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "addressId is required" }),
      };
    }

    // Delete the address and get the old item to check if it was default
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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Address deleted" }),
    };
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Address not found" }),
      };
    }
    log.error("delete-address failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
