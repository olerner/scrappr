# Scrappr

Two-sided gig marketplace for scrap metal pickup in the Twin Cities. Scrappees list unwanted scrap for free pickup; Scrapprs claim listings, haul the metal, and sell at scrap yards.

Early-stage MVP — UI only, no backend yet.

## Stack

- TypeScript, React 19, Vite, Tailwind CSS 4, Zustand, Leaflet + OpenStreetMap
- Yarn workspaces monorepo — single `ui` workspace for now

## Structure

- `ui/src/pages/` — three routes: LandingPage (`/`), ScrappeeDashboard (`/scrappee`), ScrapprDashboard (`/scrappr`)
- `ui/src/components/` — shared components (Header, MapView, CategoryIcon, StatusBadge, ScrappyDog)
- `ui/src/store/useStore.ts` — Zustand store (listings state + actions)
- `ui/src/data/types.ts` — shared TypeScript interfaces
- `ui/src/data/mockData.ts` — mock listings and constants (no backend yet)
- `docs/executive-summary.md` — business context

## Commands

```bash
yarn install          # install dependencies
yarn ui               # start dev server (localhost:5173)
yarn workspace @scrappr/ui build   # typecheck + build
yarn workspace @scrappr/ui lint    # eslint
```

## Key decisions

- Leaflet + OpenStreetMap for maps (free, no token needed) — README mentions Mapbox but we use Leaflet
- All styling via Tailwind utility classes — no CSS modules or styled-components
- Mock data uses real Twin Cities coordinates

## About this file

Keep this file short (<60 lines) and universally applicable ([principles](https://www.humanlayer.dev/blog/writing-a-good-claude-md)). Every line here is read at the start of every conversation, so low-value content has a real cost.

**Add:** project purpose, stack, structure, dev commands, non-obvious architectural decisions
**Don't add:** style/formatting rules (use linters), code patterns obvious from reading the source, task-specific instructions, anything already in code comments or docs. For detailed workflows, create separate docs and point to them from here.
