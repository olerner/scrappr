# Testing

## Philosophy

No work ships without being tested. Every feature, bug fix, and change is verified in a real browser against real infrastructure before it's accepted. We use Playwright for all testing — both automated e2e suites and manual acceptance testing.

### Core principles

1. **Test in the browser, not in your head.** Every change gets verified by running it in a real browser with Playwright. Reading code and assuming it works is not acceptance. Clicking through the flow and seeing it work is.

2. **Hit real APIs.** Tests authenticate against Cognito, call real Lambda endpoints, and write to real DynamoDB tables. We don't mock the backend. If the API is broken, the test should fail.

3. **Work is not done until it's tested and accepted.** Writing code is half the job. The other half is proving it works. A PR is not ready for review until the testing plan has been executed and passed.

4. **Every PR has a testing plan.** The PR description includes a concrete testing plan — specific steps to verify the changes work. This plan is executed against the preview environment after it deploys.

5. **Preview environments are the acceptance gate.** After a PR deploys to its preview environment, the testing plan is carried out against that preview. Only after the plan passes in the preview is the PR considered ready.

## Acceptance testing workflow

1. Make changes and **test them locally** first — run the app, exercise the feature in a browser, verify it works.
2. Push and open a PR with a **testing plan** in the description.
3. Wait for the preview environment to deploy (Storage + API + UI stacks).
4. **Test again in the preview** — run the testing plan against the preview URL. Local passing is not enough; the preview is the acceptance gate.
5. If something fails, fix it, push, and re-test against the new preview.
6. Once the testing plan passes in the preview, the PR is ready for review.

## E2E test suite

Automated Playwright tests live in `tests/` and validate critical user flows. These run in CI on every PR.

### E2E principles

1. **Test user journeys, not implementation details.** Each test maps to something a real user does: sign in, create a listing, claim a pickup. If a test doesn't correspond to a user story, it probably shouldn't be an e2e test.

2. **One happy path per feature, targeted edge cases only when burned.** We don't aim for exhaustive coverage at the e2e layer. E2e tests are expensive to write and slow to run — reserve them for flows where a break would block users.

3. **Tests must be independent and idempotent.** Each test creates its own data and doesn't depend on state from other tests. Tests should pass whether run once or ten times in a row.

4. **Use a dedicated test account.** All e2e tests authenticate as `test@scrappr.dev` / `TestPass123!`. This account exists in the dev Cognito pool and is shared across preview environments.

5. **Select elements by `data-testid` or visible user text.** Never use CSS classes, IDs, or DOM structure to find elements. Use `data-testid` attributes for interactive elements and `getByText` for asserting visible content. Add `data-testid` to components if they don't have one.

## Running tests

```bash
# Local — spins up Vite dev server automatically
yarn workspace @scrappr/e2e test

# Against a deployed preview
BASE_URL=https://your-preview-url.cloudfront.net yarn workspace @scrappr/e2e test

# Headed mode (watch the browser)
yarn workspace @scrappr/e2e test:headed
```

## CI

Tests run in GitHub Actions on every PR via `.github/workflows/e2e.yml`. In CI, Vite env vars (`VITE_USER_POOL_ID`, etc.) are injected from GitHub Secrets so the local dev server can start and connect to real AWS services.

## Adding a new test

1. Create a new `.spec.ts` file in `tests/`.
2. Follow the pattern: navigate, authenticate, perform action, assert result.
3. Use `data-testid` attributes or visible user text for selectors — add `data-testid` to the UI if needed. Never select by class or ID.
4. Keep timeouts reasonable (`10-15s` for network operations).
5. Run locally before pushing.

## Test fixtures

Static test assets (images, etc.) live in `fixtures/`. Keep them small.
