import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, parseRequest } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;

export const handler = async (event) => {
  const req = parseRequest(event);
  if (req.response) return req.response;
  const { userId, log } = req;

  try {
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
  } catch (err) {
    log.error("get-listings failed", err);
    return json(500, { error: "Internal server error" });
  }
};
