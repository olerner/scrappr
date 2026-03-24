import { readFileSync } from "node:fs";
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "./stacks/api-stack.js";
import { AuthStack } from "./stacks/auth-stack.js";
import { StorageStack } from "./stacks/storage-stack.js";
import { UiStack } from "./stacks/ui-stack.js";

// Load .env file if present (for local deploys)
try {
  const envFile = readFileSync(new URL("../.env", import.meta.url), "utf-8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^(\w+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
} catch {
  // .env not found — env vars must be set externally (CI)
}

const app = new cdk.App();
const env = app.node.tryGetContext("env") || "dev";

const awsEnv: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1",
};

const isPreview = env.startsWith("pr-");

// Auth stack — only deploy for dev/production (previews share dev Cognito)
let authStack: AuthStack | undefined;
if (!isPreview) {
  authStack = new AuthStack(app, `scrappr-auth-${env}`, {
    env: awsEnv,
    stageName: env,
    googleClientId: process.env.GOOGLE_CLIENT_ID!,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  });
}

// Storage stack — deploy for all environments
const storageStack = new StorageStack(app, `scrappr-storage-${env}`, {
  env: awsEnv,
  stageName: env,
});

// API stack — deploy for all environments (previews use dev Cognito)
const userPoolId = isPreview ? process.env.VITE_USER_POOL_ID! : authStack!.userPool.userPoolId;
const userPoolClientId = isPreview
  ? process.env.VITE_USER_POOL_CLIENT_ID!
  : authStack!.userPoolClient.userPoolClientId;

new ApiStack(app, `scrappr-api-${env}`, {
  env: awsEnv,
  stageName: env,
  userPoolId,
  userPoolClientId,
  photoBucket: storageStack.photoBucket,
});

// UI stack — S3 + CloudFront + optional custom domain
new UiStack(app, `scrappr-ui-${env}`, {
  env: awsEnv,
  envName: env,
  ...(env === "dev"
    ? {
        domainName: "scrappr.trevor.fail",
      }
    : {}),
});

app.synth();
