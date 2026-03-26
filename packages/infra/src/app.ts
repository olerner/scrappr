import { readFileSync } from "node:fs";
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "./stacks/api-stack.js";
import { AuthStack } from "./stacks/auth-stack.js";
import { EmailStack } from "./stacks/email-stack.js";
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
} catch (err: unknown) {
  const e = err as NodeJS.ErrnoException;
  if (e?.code !== "ENOENT") {
    console.warn(`Warning: Failed to read .env file: ${e?.message}`);
  }
}

const app = new cdk.App();
const env = app.node.tryGetContext("env") || "dev";

const awsEnv: cdk.Environment = {
  // Use undefined (not empty string) so CDK falls back to the Aws.ACCOUNT_ID token
  // when CDK_DEFAULT_ACCOUNT is unset or empty (e.g. fork PR workflows without secrets).
  account: process.env.CDK_DEFAULT_ACCOUNT || undefined,
  region: "us-east-1",
};

const isPreview = env.startsWith("pr-");
const isLocalDev = env.startsWith("localdev-");
const sharesDevAuth = isPreview || isLocalDev;

// Auth stack — only deploy for dev/production (previews and localdev share dev Cognito)
let authStack: AuthStack | undefined;
if (!sharesDevAuth) {
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

// API stack — deploy for all environments (previews and localdev use dev Cognito)
if (sharesDevAuth && (!process.env.VITE_USER_POOL_ID || !process.env.VITE_USER_POOL_CLIENT_ID)) {
  throw new Error(
    "VITE_USER_POOL_ID and VITE_USER_POOL_CLIENT_ID must be set when deploying preview/localdev stacks. See CLAUDE.md for setup instructions.",
  );
}
const userPoolId = sharesDevAuth ? process.env.VITE_USER_POOL_ID! : authStack!.userPool.userPoolId;
const userPoolClientId = sharesDevAuth
  ? process.env.VITE_USER_POOL_CLIENT_ID!
  : authStack!.userPoolClient.userPoolClientId;

// Email stack — deploy for dev/prod (not localdev or preview)
let emailStack: EmailStack | undefined;
if (!isLocalDev && !isPreview) {
  emailStack = new EmailStack(app, `scrappr-email-${env}`, {
    env: awsEnv,
    stageName: env,
    domainName: "scrappr.trevor.fail",
    hostedZoneDomain: "trevor.fail",
  });
}

// Determine app URL by environment
const appUrl = isLocalDev
  ? "http://localhost:5173"
  : env === "dev"
    ? "https://scrappr.trevor.fail"
    : `https://scrappr-${env}.trevor.fail`;

new ApiStack(app, `scrappr-api-${env}`, {
  env: awsEnv,
  stageName: env,
  userPoolId,
  userPoolClientId,
  photoBucket: storageStack.photoBucket,
  senderEmail: emailStack?.senderEmail,
  sendEmailPolicy: emailStack?.sendEmailPolicyStatement,
  appUrl,
});

// UI stack — skip for localdev (runs locally), deploy for everything else
if (!isLocalDev) {
  new UiStack(app, `scrappr-ui-${env}`, {
    env: awsEnv,
    envName: env,
    ...(env === "dev"
      ? {
          domainName: "scrappr.trevor.fail",
        }
      : {}),
  });
}

app.synth();
