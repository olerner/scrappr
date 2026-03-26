import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "node:crypto";
import { getUserId } from "./auth.mjs";
import { createLogger } from "./logger.mjs";

const s3 = new S3Client({});
const BUCKET = process.env.PHOTO_BUCKET;
const BUCKET_URL = process.env.PHOTO_BUCKET_URL;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
    const contentType = body.contentType;

    if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: `Invalid content type. Allowed: ${ALLOWED_TYPES.join(", ")}` }),
      };
    }

    const ext = contentType.split("/")[1].replace("jpeg", "jpg");
    const key = `photos/${randomUUID()}.${ext}`;

    const { url: uploadUrl, fields } = await createPresignedPost(s3, {
      Bucket: BUCKET,
      Key: key,
      Conditions: [
        ["content-length-range", 1, MAX_FILE_SIZE],
        ["eq", "$Content-Type", contentType],
      ],
      Fields: { "Content-Type": contentType },
      Expires: 900,
    });

    const photoUrl = `${BUCKET_URL}/${key}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadUrl, fields, photoUrl, key }),
    };
  } catch (err) {
    log.error("presign failed", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
