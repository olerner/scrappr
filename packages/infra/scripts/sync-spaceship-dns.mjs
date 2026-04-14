#!/usr/bin/env node
// Syncs DNS records from a deployed CloudFormation stack's outputs + its ACM
// certificate validation records to Spaceship DNS for `scrappr.io`.
//
// Idempotent: safe to run repeatedly. Uses Spaceship's `PUT` upsert endpoint
// with `force: true`. Never deletes records — that's intentional for now so a
// botched run can't break existing DNS.
//
// Tolerant of partial deploys: if the stack doesn't exist yet, or its outputs
// aren't populated yet, the script exits 0 with a message. This lets the
// orchestrator (deploy-env.mjs) poll it during a `cdk deploy` that's waiting
// on ACM validation.
//
// Usage:
//   node scripts/sync-spaceship-dns.mjs --stack scrappr-ui-dev
//
// Requirements:
//   - AWS_PROFILE=scrappr (or equivalent creds)
//   - SSM parameters /scrappr/spaceship/api-key and /scrappr/spaceship/api-secret

import { execFileSync } from "node:child_process";

const SPACESHIP_DOMAIN = "scrappr.io";
const AWS_PROFILE = process.env.AWS_PROFILE;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--stack") {
      out.stack = args[++i];
    }
  }
  if (!out.stack) {
    console.error("Usage: sync-spaceship-dns.mjs --stack <stack-name>");
    process.exit(2);
  }
  return out;
}

function aws(args) {
  const profileArgs = AWS_PROFILE ? ["--profile", AWS_PROFILE] : [];
  return execFileSync("aws", [...args, ...profileArgs, "--output", "json"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function getSsmParam(name) {
  const raw = aws([
    "ssm",
    "get-parameter",
    "--name",
    name,
    "--with-decryption",
    "--query",
    "Parameter.Value",
  ]);
  return JSON.parse(raw);
}

function getStackOutputs(stackName) {
  let raw;
  try {
    raw = aws(["cloudformation", "describe-stacks", "--stack-name", stackName]);
  } catch (err) {
    const msg = err?.stderr?.toString() || err?.message || "";
    if (msg.includes("does not exist")) {
      return null;
    }
    throw err;
  }
  const parsed = JSON.parse(raw);
  const stack = parsed.Stacks?.[0];
  if (!stack) return null;
  const outputs = {};
  for (const o of stack.Outputs || []) {
    outputs[o.OutputKey] = o.OutputValue;
  }
  return outputs;
}

function describeCertificate(certArn) {
  const raw = aws(["acm", "describe-certificate", "--certificate-arn", certArn]);
  return JSON.parse(raw).Certificate;
}

/**
 * Strip the Spaceship-managed zone suffix from an FQDN so Spaceship's API gets
 * just the subdomain name. ACM returns names like `_abc123.dev.scrappr.io.`
 * and Spaceship wants `_abc123.dev`.
 */
function toSpaceshipName(fqdn) {
  const trimmed = fqdn.replace(/\.$/, "");
  const suffix = `.${SPACESHIP_DOMAIN}`;
  if (trimmed === SPACESHIP_DOMAIN) return "@";
  if (!trimmed.endsWith(suffix)) {
    throw new Error(`Domain ${fqdn} is not a subdomain of ${SPACESHIP_DOMAIN}`);
  }
  return trimmed.slice(0, -suffix.length);
}

async function putSpaceshipRecords(apiKey, apiSecret, items) {
  const res = await fetch(`https://spaceship.dev/api/v1/dns/records/${SPACESHIP_DOMAIN}`, {
    method: "PUT",
    headers: {
      "X-Api-Key": apiKey,
      "X-Api-Secret": apiSecret,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ force: true, items }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spaceship PUT failed ${res.status}: ${body}`);
  }
}

async function main() {
  const { stack } = parseArgs();

  const outputs = getStackOutputs(stack);
  if (!outputs) {
    console.log(`[sync] stack ${stack} does not exist yet — nothing to sync`);
    return;
  }

  const items = [];

  // 1. ACM cert validation CNAMEs (if the cert exists yet)
  if (outputs.CertificateArn) {
    const cert = describeCertificate(outputs.CertificateArn);
    for (const opt of cert.DomainValidationOptions || []) {
      const rr = opt.ResourceRecord;
      if (!rr || rr.Type !== "CNAME") continue;
      // Only push validation records for domains in our Spaceship zone
      if (!rr.Name.replace(/\.$/, "").endsWith(`.${SPACESHIP_DOMAIN}`)) continue;
      items.push({
        type: "CNAME",
        name: toSpaceshipName(rr.Name),
        cname: rr.Value.replace(/\.$/, ""),
        ttl: 300,
      });
    }
  }

  // 2. Alias CNAMEs for each additional domain
  if (outputs.AdditionalDomains && outputs.DistributionDomain) {
    const domains = outputs.AdditionalDomains.split(",").map((s) => s.trim()).filter(Boolean);
    for (const domain of domains) {
      items.push({
        type: "CNAME",
        name: toSpaceshipName(domain),
        cname: outputs.DistributionDomain,
        ttl: 3600,
      });
    }
  }

  if (items.length === 0) {
    console.log(`[sync] stack ${stack} has no DNS records to sync yet`);
    return;
  }

  const apiKey = getSsmParam("/scrappr/spaceship/api-key");
  const apiSecret = getSsmParam("/scrappr/spaceship/api-secret");

  console.log(`[sync] upserting ${items.length} record(s) to Spaceship for ${SPACESHIP_DOMAIN}:`);
  for (const item of items) {
    console.log(`  ${item.type.padEnd(5)} ${item.name} → ${item.cname}`);
  }

  await putSpaceshipRecords(apiKey, apiSecret, items);
  console.log(`[sync] ok`);
}

main().catch((err) => {
  console.error(`[sync] error: ${err.message}`);
  process.exit(1);
});
