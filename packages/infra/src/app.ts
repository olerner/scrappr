import { readFileSync } from "node:fs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { AlertStack } from "./stacks/alert-stack.js";
import { ApiStack } from "./stacks/api-stack.js";
import { AuthStack } from "./stacks/auth-stack.js";
import { CiStack } from "./stacks/ci-stack.js";
import { EmailStack } from "./stacks/email-stack.js";
import { MonitoringStack } from "./stacks/monitoring-stack.js";
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

// CI stack — OIDC + IAM role for GitHub Actions
new CiStack(app, "scrappr-ci", { env: awsEnv });

// Email stack — deploy for dev/prod (not localdev or preview)
// Skip when SKIP_EMAIL_STACK=1 (e.g. CI where hosted zone lookup may fail)
// Deployed before auth stack so senderEmail is available for Cognito SES config.
let emailStack: EmailStack | undefined;
if (!isLocalDev && !isPreview && process.env.SKIP_EMAIL_STACK !== "1") {
  emailStack = new EmailStack(app, `scrappr-email-${env}`, {
    env: awsEnv,
    stageName: env,
    domainName: "scrappr.trevor.fail",
  });
}

// Determine app URL by environment
const appUrl = isLocalDev
  ? "http://localhost:5173"
  : env === "dev"
    ? "https://scrappr.trevor.fail"
    : `https://scrappr-${env}.trevor.fail`;

// Auth stack — only deploy for dev/production (previews and localdev share dev Cognito)
let authStack: AuthStack | undefined;
if (!sharesDevAuth) {
  authStack = new AuthStack(app, `scrappr-auth-${env}`, {
    env: awsEnv,
    stageName: env,
    googleClientId: process.env.GOOGLE_CLIENT_ID!,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    senderEmail: emailStack?.senderEmail,
    appUrl,
  });
  if (emailStack) {
    authStack.addDependency(emailStack);
  }
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

// Email config — preview/localdev share the dev SES identity
const domainName = "scrappr.trevor.fail";
const senderEmail = emailStack?.senderEmail ?? `noreply@${domainName}`;
const sendEmailPolicy =
  emailStack?.sendEmailPolicyStatement ??
  new iam.PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: [`arn:aws:ses:us-east-1:${awsEnv.account}:identity/*`],
  });

// Alert stack — shared SNS topic + AlertDigest Lambda (only for static environments)
const isStaticEnv = !isPreview && !isLocalDev;
let alertStack: AlertStack | undefined;
if (isStaticEnv) {
  alertStack = new AlertStack(app, `scrappr-alert-${env}`, {
    env: awsEnv,
    stageName: env,
    senderEmail,
    sendEmailPolicy,
  });
}

new ApiStack(app, `scrappr-api-${env}`, {
  env: awsEnv,
  stageName: env,
  alertTopic: alertStack?.alertTopic,
  userPoolId,
  userPoolClientId,
  photoBucket: storageStack.photoBucket,
  photoBucketUrl: storageStack.photoBucketUrl,
  senderEmail,
  sendEmailPolicy,
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
          // Temporary alias to prove out Spaceship DNS automation before migrating
          // dev to dev.scrappr.io. DNS is synced via scripts/sync-spaceship-dns.mjs.
          // See issue #103.
          additionalDomains: ["staging.scrappr.io"],
        }
      : {}),
  });
}

// Monitoring stack — uptime health check (only for static environments)
if (alertStack) {
  new MonitoringStack(app, `scrappr-monitoring-${env}`, {
    env: awsEnv,
    stageName: env,
    domainName: "scrappr.trevor.fail",
    alertTopic: alertStack.alertTopic,
  });
}

app.synth();
