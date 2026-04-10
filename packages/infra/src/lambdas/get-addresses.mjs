import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, parseRequest } from "./lambda-utils.mjs";

const TABLE = process.env.ADDRESSES_TABLE;

export const handler = async (event) => {
  const req = parseRequest(event);
  if (req.response) return req.response;
  const { userId, log } = req;

  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ScanIndexForward: true,
      }),
    );

    return json(200, { addresses: result.Items || [] });
  } catch (err) {
    log.error("get-addresses failed", err);
    return json(500, { error: "Internal server error" });
  }
};
