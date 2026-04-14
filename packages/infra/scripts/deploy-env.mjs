#!/usr/bin/env node
// Orchestrator that runs `cdk deploy` for all stacks in an environment and,
// in parallel, polls sync-spaceship-dns.mjs every 30s so DNS records (and ACM
// validation CNAMEs) land in Spaceship while CloudFormation is waiting on them.
//
// Usage:
//   node scripts/deploy-env.mjs --env dev
//   node scripts/deploy-env.mjs --env prod

import { spawn, execFileSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYNC_SCRIPT = path.join(__dirname, "sync-spaceship-dns.mjs");
const POLL_INTERVAL_MS = 30_000;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--env") out.env = args[++i];
  }
  if (!out.env) {
    console.error("Usage: deploy-env.mjs --env <env>");
    process.exit(2);
  }
  return out;
}

// CDK glob pattern deploys all stacks for the given env.
// Only the UI stack has CloudFront/ACM that needs DNS syncing to Spaceship.
function stackGlob(env) {
  return `scrappr-*-${env}`;
}

function dnsStack(env) {
  return `scrappr-ui-${env}`;
}

function runSyncOnce(stackName) {
  try {
    execFileSync("node", [SYNC_SCRIPT, "--stack", stackName], {
      stdio: "inherit",
    });
  } catch {
    // Swallow — during early deploy phases the stack/outputs/cert may not
    // exist yet. Next poll will try again.
  }
}

async function main() {
  const { env } = parseArgs();
  const glob = stackGlob(env);
  const dnsStackName = dnsStack(env);

  console.log(`[deploy] deploying stacks matching ${glob}`);

  const cdk = spawn(
    "npx",
    ["cdk", "deploy", glob, "--require-approval", "never", "-c", `env=${env}`],
    { stdio: "inherit", cwd: path.join(__dirname, "..") },
  );

  // Poll sync every POLL_INTERVAL_MS until cdk exits
  let polling = true;
  const pollLoop = (async () => {
    // Give CDK a head start before the first poll
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    while (polling) {
      runSyncOnce(dnsStackName);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  })();

  const code = await new Promise((resolve) => {
    cdk.on("exit", (code) => resolve(code ?? 1));
  });
  polling = false;
  await pollLoop;

  // One final sync so any just-created records are pushed
  if (code === 0) {
    console.log(`[deploy] cdk deploy succeeded — running final sync`);
    runSyncOnce(dnsStackName);
  } else {
    console.error(`[deploy] cdk deploy failed with code ${code}`);
  }

  process.exit(code);
}

main().catch((err) => {
  console.error(`[deploy] fatal: ${err.message}`);
  process.exit(1);
});
