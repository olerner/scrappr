import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, withAuth } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;
const CLAIMED_BY_INDEX = process.env.CLAIMED_BY_INDEX;

export const handler = withAuth(async (_event, { userId }) => {
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

  return json(200, { listings });
});
