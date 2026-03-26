import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { getUserId } from "./auth.mjs";
import { createLogger } from "./logger.mjs";
import { sanitizeAddress } from "./sanitize.mjs";

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

    const body = JSON.parse(event.body || "{}");
    const { label, address, lat, lng, zipCode } = body;

    if (!address || lat == null || lng == null || !zipCode) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "address, lat, lng, and zipCode are required" }),
      };
    }

    const ALLOWED_ZIPS = ["55426", "55416"];
    if (!ALLOWED_ZIPS.includes(zipCode.trim())) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Scrappr is currently only available in St. Louis Park, MN. Addresses outside this area cannot be saved at this time.",
        }),
      };
    }

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
    const sanitized = sanitizeAddress({ label: label || "", address });
    const item = {
      userId,
      addressId,
      label: sanitized.label,
      address: sanitized.address,
      lat,
      lng,
      zipCode: zipCode.trim(),
      isDefault,
      createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    };
  } catch (err) {
    log.error("create-address failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
