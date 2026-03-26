import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { getUserId } from "./auth.mjs";
import { createLogger } from "./logger.mjs";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.ADDRESSES_TABLE;

const ALLOWED_FIELDS = ["label", "address", "lat", "lng", "zipCode", "isDefault"];

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

    const body = JSON.parse(event.body || "{}");

    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No valid fields to update" }),
      };
    }

    // Validate zip code if being updated
    const ALLOWED_ZIPS = ["55426", "55416"];
    if (updates.zipCode && !ALLOWED_ZIPS.includes(updates.zipCode.trim())) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Scrappr is currently only available in St. Louis Park, MN. Addresses outside this area cannot be saved at this time.",
        }),
      };
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

    // Build UpdateExpression dynamically
    const expressionParts = [];
    const expressionValues = {};
    const expressionNames = {};

    for (const [key, value] of Object.entries(updates)) {
      expressionParts.push(`#${key} = :${key}`);
      expressionValues[`:${key}`] = key === "zipCode" ? value.trim() : value;
      expressionNames[`#${key}`] = key;
    }

    expressionParts.push("#updatedAt = :updatedAt");
    expressionValues[":updatedAt"] = new Date().toISOString();
    expressionNames["#updatedAt"] = "updatedAt";

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { userId, addressId },
        UpdateExpression: `SET ${expressionParts.join(", ")}`,
        ExpressionAttributeValues: expressionValues,
        ExpressionAttributeNames: expressionNames,
        ConditionExpression: "attribute_exists(addressId)",
        ReturnValues: "ALL_NEW",
      }),
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Address updated" }),
    };
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Address not found" }),
      };
    }
    log.error("update-address failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
