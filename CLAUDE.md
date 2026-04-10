# Scrappr

Two-sided gig marketplace for scrap metal pickup in the Twin Cities. Scrappees list unwanted scrap for free pickup; Scrapprs claim listings, haul the metal, and sell at scrap yards.

## Stack

- **Web:** Vite, React, Tailwind CSS, Zustand, Leaflet, react-router-dom
- **Infra:** AWS CDK (TypeScript) — Cognito (auth), S3 + CloudFront + ACM + Route53 (hosting)
- **Local API:** SAM CLI — runs Lambda handlers locally against real AWS resources
- **Linting:** Biome (TS/JS), Prettier (JSON, YAML, MD)
- **Monorepo:** Yarn workspaces

## Structure

- `packages/ui/` — @scrappr/ui: Vite/React web app
- `packages/infra/` — @scrappr/infra: CDK stacks (AuthStack, ApiStack, StorageStack, UiStack)
- `packages/e2e/` — @scrappr/e2e: Playwright e2e tests
- `template.yaml` — SAM template for local API development

## Commands

```bash
yarn install                            # install all workspace deps
yarn dev                                # start SAM API (localhost:3000) + Vite UI (localhost:5173)
yarn ui                                 # start Vite dev server only
yarn api                                # start SAM local API only
yarn deploy                             # build UI + cdk deploy all stacks
yarn infra:diff                         # diff CDK changes
yarn run check                          # biome + prettier check
yarn lint:fix                           # biome auto-fix
yarn format                             # prettier auto-fix
```

## Local dev

Each developer deploys their own `localdev-{name}` stage with real DynamoDB + S3, sharing the dev Cognito pool:

```bash
# One-time: deploy your personal dev resources
VITE_USER_POOL_ID=us-east-1_N45oIsOs3 VITE_USER_POOL_CLIENT_ID=6gups5rfm8u2tvddoiqqos968g \
  npx cdk deploy "scrappr-storage-localdev-yourname" "scrappr-api-localdev-yourname" -c env=localdev-yourname

# Then update template.yaml with your resource names and run:
yarn dev
```

## Testing

All work must be browser-tested and accepted before shipping. See [`packages/e2e/README.md`](packages/e2e/README.md) for the full testing philosophy and PR workflow.

## Commits

Include the GitHub issue number in commit messages when the commit addresses an issue, e.g. `fix: validate photoUrl on write (#52, #53)`.

Before pushing, run `npx fallow` (or `/fallow`) to check for dead code, duplication, and health regressions. Fix any new issues before pushing.

## PRs

Use `/pr` to open pull requests. See [`.claude/skills/pr/SKILL.md`](.claude/skills/pr/SKILL.md).

## Key decisions

- All infra is CDK — no imperative deploy scripts
- Twin Cities only — no geohash, client-side distance filtering
- Address privacy: full address hidden until listing is claimed
- Mobile app shelved on `mobile-ui-polish` branch for later

## AWS

- Region: us-east-1
- Domain: scrappr.trevor.fail
