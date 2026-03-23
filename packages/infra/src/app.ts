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

// Auth stack — only deploy for dev/production (previews share dev Cognito)
let authStack: AuthStack | undefined;
if (!env.startsWith("pr-")) {
  authStack = new AuthStack(app, `scrappr-auth-${env}`, {
    env: awsEnv,
    stageName: env,
    googleClientId: process.env.GOOGLE_CLIENT_ID!,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  });
}

// Storage stack — only deploy for dev/production
let storageStack: StorageStack | undefined;
if (!env.startsWith("pr-")) {
  storageStack = new StorageStack(app, `scrappr-storage-${env}`, {
    env: awsEnv,
    stageName: env,
  });
}

// API stack — only deploy for dev/production
if (!env.startsWith("pr-") && authStack && storageStack) {
  new ApiStack(app, `scrappr-api-${env}`, {
    env: awsEnv,
    stageName: env,
    userPoolId: authStack.userPool.userPoolId,
    userPoolClientId: authStack.userPoolClient.userPoolClientId,
    photoBucket: storageStack.photoBucket,
  });
}

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
