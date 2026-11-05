// SPDX-License-Identifier: AGPL-3.0-or-later
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { SYNTHETIC, toConfirm, toResults } from "./helpers";

const check = async (page: import("@playwright/test").Page) => {
  const { violations } = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
};
test("入力画面", async ({ page }) => { await page.goto("./"); await check(page); });
test("確認画面", async ({ page }) => { await toConfirm(page, SYNTHETIC); await check(page); });
test("概要と各体系", async ({ page }) => {
  await toResults(page, SYNTHETIC);
  await check(page);
  for (const tab of ["遺伝子易経", "西洋占星術", "インド占星術", "数秘術"]) {
    await page.getByRole("link", { name: tab, exact: true }).first().click();
    await check(page);
  }
  await page.getByRole("link", { name: "ライフパス" }).first().click();
  await check(page);
});
test("このサイトについて", async ({ page }) => { await page.goto("./#about"); await check(page); });
