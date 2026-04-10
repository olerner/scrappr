---
name: fallow
description: Run fallow codebase analysis (dead code, duplication, health)
allowed-tools: Bash(npx fallow *)
---

# Fallow Analysis

Run fallow to analyze the codebase for dead code, duplication, and health issues.

## Steps

1. Run `npx fallow` to get the full analysis (dead code + duplication + health).
2. Review the output and report:
   - **Dead code** — unused files, exports, types, unlisted dependencies
   - **Duplication** — clone groups, focusing on cross-file duplicates
   - **Health** — maintainability score, hotspots, refactoring targets
3. Flag any new issues that should be addressed before shipping.

## Subcommands

- `npx fallow dead-code` — unused code and dependency issues only
- `npx fallow dupes` — duplication analysis only
- `npx fallow health` — complexity hotspots and refactoring targets only
- `npx fallow audit` — audit only changed files (good for PR review)

## Rules

- The unresolved import for `index.html → /src/main.tsx` is a known Vite false positive — ignore it.
- Lambda handlers are configured as entry points in `.fallowrc.json` — if you add a new handler, add it to the entry pattern.
- Maintainability score target: 85+ (good). Current baseline: 92.8.
