import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, withAuth } from "./lambda-utils.mjs";

const TABLE = process.env.ADDRESSES_TABLE;

export const handler = withAuth(async (_event, { userId }) => {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
      ScanIndexForward: true,
    }),
  );

  return json(200, { addresses: result.Items || [] });
});
