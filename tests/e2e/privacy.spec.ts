// SPDX-License-Identifier: AGPL-3.0-or-later
// 出生情報が端末の外へ出ないことを、実際の通信で確かめる。入力はすべて合成の目印。
import { expect, test } from "@playwright/test";
import { toResults } from "./helpers";

const MARKS = ["1987", "06-23", "13:47", "13%3A47", "世田谷", "%E4%B8%96", "setagaya", "35.64", "139.6"];

test("すべての通信が同じ配信元の静的取得で、入力を含まない", async ({ page, baseURL }) => {
  const seen: { method: string; url: string; body: string | null }[] = [];
  page.on("request", (r) => seen.push({ method: r.method(), url: r.url(), body: r.postData() }));
  const violations: string[] = [];
  page.on("console", (m) => { if (/Content.Security.Policy|CSP/i.test(m.text())) violations.push(m.text()); });
  await toResults(page, { y: "1987", m: "6", d: "23", time: "13:47", place: "世田谷", pick: "東京都世田谷区" });
  for (const tab of ["遺伝子易経", "西洋占星術", "インド占星術", "数秘術"]) await page.getByRole("link", { name: tab, exact: true }).first().click();
  await page.getByRole("link", { name: "ライフパス" }).first().click();
  await page.waitForLoadState("networkidle");

  const origin = new URL(baseURL!).origin;
  expect(seen.length).toBeGreaterThan(3);
  for (const r of seen) {
    expect(new URL(r.url).origin, r.url).toBe(origin);
    expect(r.method).toBe("GET");
    expect(r.body).toBeNull();
    expect(new URL(r.url).search, r.url).toBe("");
    for (const mark of MARKS) expect(r.url.includes(mark), `${mark} in ${r.url}`).toBe(false);
  }
  for (const mark of MARKS) expect(page.url().includes(mark), mark).toBe(false);
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie])).toEqual([0, 0, ""]);
});

test("外部へ通信しようとしても CSP が遮断する", async ({ page }) => {
  await page.goto("./");
  const blocked = await page.evaluate(() => fetch("https://example.com/").then(() => false, () => true));
  expect(blocked).toBe(true);
});

test("応答に検索除外と CSP が付く", async ({ page }) => {
  const r = await page.goto("./");
  const h = r!.headers();
  expect(h["x-robots-tag"]).toContain("noindex");
  expect(h["content-security-policy"]).toContain("connect-src 'self'");
  expect(h["referrer-policy"]).toBe("no-referrer");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,nofollow");
});

test("公開物に解析タグや外部の読み込みを含まない", async ({ page }) => {
  await page.goto("./");
  const html = await page.content();
  expect(html).not.toMatch(/googletagmanager|google-analytics|gtag|fonts\.googleapis/);
});
