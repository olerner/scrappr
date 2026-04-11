import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, withAuth } from "./lambda-utils.mjs";

const TABLE = process.env.USER_PROFILES_TABLE;

export const handler = withAuth(async (_event, { userId }) => {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId },
    }),
  );

  // If no profile yet, return an empty one — the client just needs a phone field.
  return json(200, { profile: result.Item || { userId } });
});
