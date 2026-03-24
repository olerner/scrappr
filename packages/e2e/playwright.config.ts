import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: process.env.BASE_URL
    ? undefined
    : [
        {
          command: "docker compose up -d dynamodb-local && yarn api-setup-db && yarn api",
          port: 3001,
          cwd: "../..",
          reuseExistingServer: true,
          timeout: 30_000,
        },
        {
          command: "yarn workspace @scrappr/ui dev",
          port: 5173,
          cwd: "../..",
          reuseExistingServer: true,
          timeout: 30_000,
        },
      ],
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
