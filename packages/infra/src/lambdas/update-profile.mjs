import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, json, withAuth } from "./lambda-utils.mjs";
import { sanitizePhone } from "./sanitize.mjs";

const TABLE = process.env.USER_PROFILES_TABLE;

export const handler = withAuth(async (event, { userId }) => {
  const body = JSON.parse(event.body || "{}");
  const { phone } = body;

  let normalizedPhone = "";
  if (phone) {
    try {
      normalizedPhone = sanitizePhone(phone);
    } catch (err) {
      return json(400, { error: err.message });
    }
  }

  const item = {
    userId,
    phone: normalizedPhone,
    updatedAt: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

  return json(200, { profile: item });
});
