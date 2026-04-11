#!/usr/bin/env node
// Orchestrator that runs `cdk deploy` and, in parallel, polls
// sync-spaceship-dns.mjs every 30s so DNS records (and ACM validation CNAMEs)
// land in Spaceship while CloudFormation is waiting on them.
//
// Only targets the dev UI + auth stacks for now. Expand as more envs / stacks
// start needing Spaceship-managed DNS.
//
// Usage:
//   node scripts/deploy-env.mjs --env dev

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

// Stacks each env needs to sync DNS for. The orchestrator will cdk-deploy this
// list (CDK figures out dependency order) and poll sync for each stack in the
// list throughout the deploy.
const STACKS_BY_ENV = {
  dev: ["scrappr-auth-dev", "scrappr-ui-dev"],
};

// Only these stacks have DNS that needs syncing to Spaceship.
const DNS_STACKS_BY_ENV = {
  dev: ["scrappr-ui-dev"],
};

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
  const stacks = STACKS_BY_ENV[env];
  const dnsStacks = DNS_STACKS_BY_ENV[env];
  if (!stacks) {
    console.error(`Unknown env: ${env}`);
    process.exit(2);
  }

  console.log(`[deploy] deploying stacks for ${env}: ${stacks.join(" ")}`);

  const cdk = spawn(
    "npx",
    ["cdk", "deploy", ...stacks, "--require-approval", "never", "-c", `env=${env}`],
    { stdio: "inherit", cwd: path.join(__dirname, "..") },
  );

  // Poll sync every POLL_INTERVAL_MS until cdk exits
  let polling = true;
  const pollLoop = (async () => {
    // Give CDK a head start before the first poll
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    while (polling) {
      for (const stack of dnsStacks) {
        runSyncOnce(stack);
      }
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
    for (const stack of dnsStacks) {
      runSyncOnce(stack);
    }
  } else {
    console.error(`[deploy] cdk deploy failed with code ${code}`);
  }

  process.exit(code);
}

main().catch((err) => {
  console.error(`[deploy] fatal: ${err.message}`);
  process.exit(1);
});
