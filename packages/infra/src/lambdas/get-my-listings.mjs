import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, withAuth } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;

export const handler = withAuth(async (_event, { userId }) => {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "userId-createdAt-index",
      KeyConditionExpression: "userId = :uid",
      FilterExpression: "attribute_not_exists(isDeleted) OR isDeleted <> :true",
      ExpressionAttributeValues: { ":uid": userId, ":true": true },
      ScanIndexForward: false,
    }),
  );

  return json(200, { listings: result.Items || [] });
});
