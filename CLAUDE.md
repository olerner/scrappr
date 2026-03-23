# Scrappr

Two-sided gig marketplace for scrap metal pickup in the Twin Cities. Scrappees list unwanted scrap for free pickup; Scrapprs claim listings, haul the metal, and sell at scrap yards.

## Stack

- **Web:** Vite, React, Tailwind CSS, Zustand, Leaflet, react-router-dom
- **Infra:** AWS CDK (TypeScript) — Cognito (auth), S3 + CloudFront + ACM + Route53 (hosting)
- **Linting:** Biome (TS/JS), Prettier (JSON, YAML, MD)
- **Monorepo:** Yarn workspaces

## Structure

- `packages/ui/` — @scrappr/ui: Vite/React web app
- `packages/infra/` — @scrappr/infra: CDK stacks (AuthStack, UiStack)

## Commands

```bash
yarn install                            # install all workspace deps
yarn ui                                 # start Vite dev server (localhost:5173)
yarn deploy                             # build UI + cdk deploy all stacks
yarn infra:diff                         # diff CDK changes
yarn run check                          # biome + prettier check
yarn lint:fix                           # biome auto-fix
yarn format                             # prettier auto-fix
```

## Key decisions

- All infra is CDK — no imperative deploy scripts
- Twin Cities only — no geohash, client-side distance filtering
- Address privacy: full address hidden until listing is claimed
- Mobile app shelved on `mobile-ui-polish` branch for later

## AWS

- Region: us-east-1
- Domain: scrappr.trevor.fail
