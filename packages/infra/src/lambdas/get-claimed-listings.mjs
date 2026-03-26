import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserId } from "./auth.mjs";
import { createLogger } from "./logger.mjs";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.LISTINGS_TABLE;
const CLAIMED_BY_INDEX = process.env.CLAIMED_BY_INDEX;

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

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: CLAIMED_BY_INDEX,
        KeyConditionExpression: "claimedBy = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ScanIndexForward: false, // newest claims first
      })
    );

    // Hauler has claimed these — show full address
    const listings = (result.Items || []).map(({ userId: _ownerId, ...item }) => item);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listings }),
    };
  } catch (err) {
    log.error("get-claimed-listings failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
