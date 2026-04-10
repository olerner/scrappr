import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { sanitizeListing } from "./sanitize.mjs";
import { ddb, json, withAuth, validateZip } from "./lambda-utils.mjs";

const TABLE = process.env.LISTINGS_TABLE;

export const handler = withAuth(async (event, { userId }) => {
  const body = JSON.parse(event.body || "{}");
  const { category, description, photoUrl, lat, lng, address, zipCode, estimatedValue } = body;

  if (!category || !description) {
    return json(400, { error: "category and description are required" });
  }

  const zipErr = validateZip(zipCode);
  if (zipErr) return zipErr;

  const listingId = randomUUID();
  let item;
  try {
    item = sanitizeListing({
      userId,
      listingId,
      category,
      description,
      photoUrl: photoUrl || "",
      lat: lat || 0,
      lng: lng || 0,
      address: address || "",
      zipCode: zipCode.trim(),
      status: "available",
      datePosted: new Date().toISOString().split("T")[0],
      estimatedValue: estimatedValue || "Varies",
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    return json(400, { error: err.message });
  }

  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

  return json(201, item);
});
