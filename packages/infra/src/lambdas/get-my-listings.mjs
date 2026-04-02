import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserId } from "./auth.mjs";
import { createLogger } from "./logger.mjs";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.LISTINGS_TABLE;

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
        IndexName: "userId-createdAt-index",
        KeyConditionExpression: "userId = :uid",
        FilterExpression: "attribute_not_exists(isDeleted) OR isDeleted <> :true",
        ExpressionAttributeValues: { ":uid": userId, ":true": true },
        ScanIndexForward: false,
      })
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listings: result.Items || [] }),
    };
  } catch (err) {
    log.error("get-my-listings failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
