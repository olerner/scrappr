import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, withAuth } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;

export const handler = withAuth(async (event, { userId }) => {
  const mine = event.queryStringParameters?.mine;

  if (mine === "true") {
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
    return json(200, { listings: result.Items || [] });
  }

  return json(400, { error: "Query parameter mine=true is required" });
});
