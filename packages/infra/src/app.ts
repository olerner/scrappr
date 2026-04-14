import { readFileSync } from "node:fs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { AlertStack } from "./stacks/alert-stack.js";
import { ApiStack } from "./stacks/api-stack.js";
import { AuthStack } from "./stacks/auth-stack.js";
import { CiStack } from "./stacks/ci-stack.js";
import { EmailStack } from "./stacks/email-stack.js";
import { MonitoringStack } from "./stacks/monitoring-stack.js";
import { RedirectStack } from "./stacks/redirect-stack.js";
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

// ── Per-environment domain config ─────────────────────────────────────
const envDomain = env === "prod" ? "scrappr.io" : env === "dev" ? "dev.scrappr.io" : undefined;

const appUrl = isLocalDev
  ? "http://localhost:5173"
  : envDomain
    ? `https://${envDomain}`
    : `https://scrappr-${env}.scrappr.io`;

const domains = envDomain ? [envDomain] : [];

// CI stack — OIDC + IAM role for GitHub Actions
new CiStack(app, "scrappr-ci", { env: awsEnv });

// Email stack — deploy for dev/prod (not localdev or preview)
// Skip when SKIP_EMAIL_STACK=1 (e.g. CI rollback where SES setup may fail)
// Deployed before auth stack so senderEmail is available for Cognito SES config.
let emailStack: EmailStack | undefined;
if (!isLocalDev && !isPreview && process.env.SKIP_EMAIL_STACK !== "1" && envDomain) {
  emailStack = new EmailStack(app, `scrappr-email-${env}`, {
    env: awsEnv,
    stageName: env,
    domainName: envDomain,
    enableInbound: env === "dev",
  });
}

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
    additionalDomains: domains,
  });
  if (emailStack) {
    authStack.addDependency(emailStack);
  }
}

// Storage stack — deploy for all environments
const storageStack = new StorageStack(app, `scrappr-storage-${env}`, {
  env: awsEnv,
  stageName: env,
  appUrl,
  additionalDomains: domains,
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
const senderEmail = emailStack?.senderEmail ?? "noreply@dev.scrappr.io";
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
  additionalDomains: domains,
});

// UI stack — skip for localdev (runs locally), deploy for everything else
if (!isLocalDev) {
  new UiStack(app, `scrappr-ui-${env}`, {
    env: awsEnv,
    envName: env,
    domains,
  });
}

// Monitoring stack — uptime health check (only for static environments)
if (alertStack && envDomain) {
  new MonitoringStack(app, `scrappr-monitoring-${env}`, {
    env: awsEnv,
    stageName: env,
    domainName: envDomain,
    alertTopic: alertStack.alertTopic,
  });
}

// Redirect old domain to new dev domain
new RedirectStack(app, "scrappr-redirect", {
  env: awsEnv,
  fromDomain: "scrappr.trevor.fail",
  toDomain: "dev.scrappr.io",
});

app.synth();
