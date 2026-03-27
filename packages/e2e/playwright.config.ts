import { defineConfig } from "@playwright/test";

const isLocal = !process.env.BASE_URL;

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: isLocal
    ? [
        {
          command: "yarn api",
          port: 3000,
          cwd: "../..",
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: "yarn ui",
          port: 5173,
          cwd: "../..",
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ]
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
