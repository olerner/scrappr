// Set env vars BEFORE importing Lambda handlers so their module-level
// AWS SDK clients connect to DynamoDB Local instead of real AWS.
process.env.AWS_ENDPOINT_URL = "http://localhost:8000";
process.env.AWS_ACCESS_KEY_ID = "local";
process.env.AWS_SECRET_ACCESS_KEY = "local";
process.env.AWS_REGION = "us-east-1";
process.env.LISTINGS_TABLE = "scrappr-listings-local";
process.env.PHOTO_BUCKET = "scrappr-photos-local";

import express from "express";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, "uploads");

const PORT = process.env.PORT || 3001;
const LAMBDAS_DIR = "../infra/src/lambdas";

// ─────────────────────────────────────────────────────────────────────
// Route map — the ONLY place to update when adding a new Lambda.
// Format: [method, path, handlerFile, { auth }]
//
// Keep this in sync with api-stack.ts routes.
// ─────────────────────────────────────────────────────────────────────
const ROUTES = [
  // presign is handled separately below (local file upload, no S3)
  ["POST", "/listings", "create-listing.mjs", { auth: true }],
  ["GET", "/listings", "get-listings.mjs", { auth: true }],
  ["POST", "/errors", "report-error.mjs", { auth: false }],
];

// ── Helpers ─────────────────────────────────────────────────────────

/** Decode a Cognito JWT to extract claims (no verification — local dev only). */
function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

/** Build a Lambda event object that matches API Gateway HTTP API (v2) format. */
function toLambdaEvent(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const claims = decodeJwt(token);

  return {
    body: JSON.stringify(req.body),
    headers: req.headers,
    queryStringParameters: req.query,
    rawPath: req.path,
    requestContext: {
      requestId: randomUUID(),
      http: { method: req.method, path: req.path },
      authorizer: claims ? { jwt: { claims } } : undefined,
    },
  };
}

/** Send a Lambda response through Express. */
function sendLambdaResponse(res, lambdaResult) {
  const headers = lambdaResult.headers || {};
  for (const [k, v] of Object.entries(headers)) {
    res.header(k, v);
  }
  res.status(lambdaResult.statusCode).send(lambdaResult.body);
}

// ── App setup ───────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// CORS
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── Local presign + file upload (replaces S3) ───────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

app.post("/photos/presign", (req, res) => {
  const event = toLambdaEvent(req);
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims?.sub) return res.status(401).json({ error: "Unauthorized" });

  const { contentType } = req.body || {};
  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return res.status(400).json({ error: `Invalid content type. Allowed: ${ALLOWED_TYPES.join(", ")}` });
  }

  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const key = `photos/${randomUUID()}.${ext}`;

  res.json({
    uploadUrl: `http://localhost:${PORT}/uploads/${key}`,
    photoUrl: `http://localhost:${PORT}/uploads/${key}`,
    key,
  });
});

console.log("  POST /photos/presign → local (no S3)");

app.put("/uploads/photos/:filename", express.raw({ type: "*/*", limit: "10mb" }), (req, res) => {
  const filePath = join(UPLOADS_DIR, "photos", req.params.filename);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, req.body);
  console.log(`  Saved upload: ${filePath}`);
  res.sendStatus(200);
});

app.use("/uploads", express.static(UPLOADS_DIR));

// ── Register routes from config ─────────────────────────────────────

for (const [method, path, handlerFile, opts] of ROUTES) {
  const { handler } = await import(`${LAMBDAS_DIR}/${handlerFile}`);
  const expressMethod = method.toLowerCase();

  app[expressMethod](path, async (req, res) => {
    const event = toLambdaEvent(req);

    // Auth check
    if (opts.auth) {
      const claims = event.requestContext.authorizer?.jwt?.claims;
      if (!claims?.sub) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const result = await handler(event);
    sendLambdaResponse(res, result);
  });

  console.log(`  ${method} ${path} → ${handlerFile}`);
}

// ── Start ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nLocal API running at http://localhost:${PORT}`);
  console.log("Using DynamoDB Local at http://localhost:8000");
  console.log(
    "\nMake sure DynamoDB Local is running:  docker compose up -d dynamodb-local",
  );
  console.log("Create the table if needed:           yarn setup-db\n");
});
