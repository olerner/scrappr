import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { createLogger } from "./logger.mjs";

const s3 = new S3Client({});
const BUCKET = process.env.PHOTO_BUCKET;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export const handler = async (event) => {
  const log = createLogger(event);
  try {
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

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    const photoUrl = `https://${BUCKET}.s3.amazonaws.com/${key}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadUrl, photoUrl, key }),
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
