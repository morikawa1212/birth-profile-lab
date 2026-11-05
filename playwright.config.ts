// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig, devices } from "@playwright/test";

// E2E_BASE を指定すると、公開済みの URL に対して同じテストを実行する
const remote = process.env.E2E_BASE;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  timeout: 20_000,
  reporter: [["list"]],
  use: { baseURL: remote ?? "http://127.0.0.1:8796/profile-lab/app/", locale: "ja-JP", timezoneId: "Asia/Tokyo" },
  ...(remote ? {} : { webServer: { command: "node tests/e2e/serve.mjs", url: "http://127.0.0.1:8796/profile-lab/app/", reuseExistingServer: false } }),
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /a11y/ },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: /a11y/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: /a11y/ },
    { name: "iphone-webkit", use: { ...devices["iPhone 13"] }, testIgnore: /a11y/ },
    { name: "android-chromium", use: { ...devices["Pixel 7"] }, testIgnore: /a11y/ },
    // axe の注入のため CSP のみ無効にする
    { name: "a11y", use: { ...devices["Desktop Chrome"], bypassCSP: true }, testMatch: /a11y/ },
  ],
});
