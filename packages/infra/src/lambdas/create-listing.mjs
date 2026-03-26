import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
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

    const body = JSON.parse(event.body || "{}");
    const { category, description, photoUrl, lat, lng, address, zipCode, estimatedValue } = body;

    if (!category || !description) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "category and description are required" }),
      };
    }

    const ALLOWED_ZIPS = ["55426", "55416"];
    if (!zipCode || !ALLOWED_ZIPS.includes(zipCode.trim())) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Scrappr is currently only available in St. Louis Park, MN. Listings outside this area cannot be created at this time.",
        }),
      };
    }

    const listingId = randomUUID();
    const item = {
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
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    };
  } catch (err) {
    log.error("create-listing failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
