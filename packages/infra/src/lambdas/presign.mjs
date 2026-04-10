import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "node:crypto";
import { json, parseRequest } from "./lambda-utils.mjs";

const s3 = new S3Client({});
const BUCKET = process.env.PHOTO_BUCKET;
const BUCKET_URL = process.env.PHOTO_BUCKET_URL;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const handler = async (event) => {
  const req = parseRequest(event);
  if (req.response) return req.response;
  const { log } = req;

  try {
    const body = JSON.parse(event.body || "{}");
    const contentType = body.contentType;

    if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
      return json(400, { error: `Invalid content type. Allowed: ${ALLOWED_TYPES.join(", ")}` });
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

    return json(200, { uploadUrl, fields, photoUrl, key });
  } catch (err) {
    log.error("presign failed", err);
    return json(500, { error: "Internal server error" });
  }
};
