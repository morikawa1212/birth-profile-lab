// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";
import { fillBirth, SYNTHETIC, toConfirm, toResults } from "./helpers";

test("入力から結果まで、Python 基準と同じ値が表示される", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await toConfirm(page, SYNTHETIC);
  await expect(page.getByText("UTC+09:00")).toBeVisible();
  await expect(page.getByText("2000-01-01 03:00:00 UTC")).toBeVisible();
  await page.getByRole("button", { name: "この条件で計算する" }).click();
  await expect(page.getByRole("heading", { name: "計算結果の概要" })).toBeVisible();
  await page.getByRole("link", { name: "遺伝子易経", exact: true }).first().click();
  const want: Record<string, string> = { ライフワーク: "38.1", 進化: "39.1", 輝き: "48.3", 目的: "21.3", 引き寄せ: "29.3", IQ: "34.2", EQ: "30.4", SQ: "29.5", コア: "26.6", 天職: "26.6", 文化: "27.1", パール: "42.5" };
  for (const [label, value] of Object.entries(want)) {
    await expect(page.getByRole("link", { name: `${label} ${value}` })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "公式サイト" })).toHaveAttribute("href", "https://genekeys.com/");
  await page.getByRole("link", { name: "インド占星術", exact: true }).click();
  await expect(page.getByText("スヴァーティー 第3パーダ")).toBeVisible();
  await page.getByRole("link", { name: "西洋占星術", exact: true }).click();
  await expect(page.getByRole("link", { name: /ASC 牡羊座 23\.\d\d°/ })).toBeVisible();
  await page.getByRole("link", { name: "数秘術", exact: true }).click();
  await expect(page.getByRole("link", { name: "ライフパス 4" })).toBeVisible();
  await expect(page.getByText("2000 → 2")).toBeVisible();
  expect(errors).toEqual([]);
});

test("詳細は解説準備中でも動き、辞典と公式への案内がある", async ({ page }) => {
  await toResults(page, SYNTHETIC);
  await page.getByRole("link", { name: "ライフワーク 38.1" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "ライフワーク" })).toBeVisible();
  if (!process.env.E2E_BASE) await expect(page.getByText("解説準備中").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /^第38の鍵/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "第38の鍵を64卦辞典で読む" })).toHaveAttribute("href", /iching\/#ich-hex-38$/);
  await expect(page.getByRole("link", { name: "公式サイト" })).toBeVisible();
  await expect(page.getByRole("link", { name: "個別セッションについて" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "計算結果の概要" })).toBeVisible();
});

test("時刻不明は数秘のみ計算し、正午で埋めない", async ({ page }) => {
  await toConfirm(page, { y: "2000", m: "1", d: "1", accuracy: "不明" });
  await page.getByRole("button", { name: "この条件で計算する" }).click();
  await expect(page.getByRole("heading", { name: "計算結果の概要" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ライフパス 4" })).toBeVisible();
  await expect(page.getByText("この体系の計算には出生時刻が必要です。")).toHaveCount(3);
  await expect(page.getByText("ライフワーク")).toHaveCount(0);
});

test("おおよその時刻は仮計算の1行を出す", async ({ page }) => {
  await toResults(page, { ...SYNTHETIC, accuracy: "おおよそわかる" });
  await expect(page.getByText("おおよその時刻による仮計算です。")).toBeVisible();
});

test("日本の夏時間: 存在しない時刻と重複する時刻", async ({ page }) => {
  await toConfirm(page, { y: "1950", m: "5", d: "7", time: "00:30", place: "東京都千代田区" });
  await expect(page.getByText("この現地時刻は存在しません")).toBeVisible();
  await expect(page.getByRole("button", { name: "この条件で計算する" })).toBeDisabled();

  await toConfirm(page, { y: "1950", m: "9", d: "10", time: "00:30", place: "東京都千代田区" });
  await expect(page.getByRole("button", { name: "この条件で計算する" })).toBeDisabled();
  await page.getByRole("button", { name: /切り替え後/ }).click();
  await expect(page.getByText("1950-09-09 15:30:00 UTC")).toBeVisible();
  await page.getByRole("button", { name: "この条件で計算する" }).click();
  await expect(page.getByRole("heading", { name: "計算結果の概要" })).toBeVisible();
});

test("夏時間中の日本は UTC+10 と表示する", async ({ page }) => {
  await toConfirm(page, { y: "1950", m: "7", d: "1", time: "10:00", place: "東京都千代田区" });
  await expect(page.getByText("UTC+10:00(夏時間)")).toBeVisible();
});

test("海外の検索と1970年以前の UTC差修正", async ({ page }) => {
  await page.goto("./");
  await fillBirth(page, { y: "1935", m: "7", d: "1", time: "12:00" });
  await page.getByLabel("海外", { exact: true }).check();
  await page.getByLabel(/都市名/).fill("アムステルダム");
  await page.getByRole("button", { name: /アムステルダム/ }).first().click();
  await page.getByRole("button", { name: "確認へ進む" }).click();
  await expect(page.getByText("1970年より前の海外の時刻記録")).toBeVisible();
  await page.getByLabel("UTC差(例: +09:00)").fill("+01:19:32");
  await page.getByRole("button", { name: "この値を使う" }).click();
  await expect(page.getByText("1935-07-01 10:40:28 UTC")).toBeVisible();
  await page.getByRole("button", { name: "この条件で計算する" }).click();
  await expect(page.getByText("UTC差は入力された値を使っています。")).toBeVisible();
});

test("出生地不明はハウスとラグナを保留する", async ({ page }) => {
  await page.goto("./");
  await fillBirth(page, { y: "2000", m: "1", d: "1", time: "12:00" });
  await page.getByLabel("わからない", { exact: true }).check();
  await page.getByRole("button", { name: "確認へ進む" }).click();
  await page.getByRole("button", { name: "この条件で計算する" }).click();
  await page.getByRole("link", { name: "西洋占星術", exact: true }).first().click();
  await expect(page.getByText("ハウス、ASC、MCは保留しています")).toBeVisible();
});

test("緯度・経度の手入力", async ({ page }) => {
  await page.goto("./");
  await fillBirth(page, { y: "2000", m: "1", d: "1", time: "12:00" });
  await page.getByLabel("緯度・経度で入力", { exact: true }).check();
  await page.getByLabel("緯度(北が正)").fill("95");
  await page.getByLabel("経度(東が正)").fill("139");
  await page.getByRole("button", { name: "この地点を使う" }).click();
  await expect(page.getByText("緯度は -90〜90")).toBeVisible();
  await page.getByLabel("緯度(北が正)").fill("35.68");
  await page.getByRole("button", { name: "この地点を使う" }).click();
  await expect(page.getByText("この地点を使います。")).toBeVisible();
  await page.getByRole("button", { name: "確認へ進む" }).click();
  await expect(page.getByText("35.68, 139")).toBeVisible();
});

test("旧地名の検索と案内", async ({ page }) => {
  await page.goto("./");
  await page.getByLabel(/市区町村名/).fill("牛窓町牛窓");
  await expect(page.getByText("候補が見つかりません。")).toBeVisible();
  await expect(page.getByText("合併後の現在の市町村")).toBeVisible();
  await page.getByLabel(/旧地名・地区名から探す/).check();
  await expect(page.getByRole("button", { name: /牛窓町牛窓/ })).toBeVisible();
});

test("入力エラー: 未来の日付、未入力", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "確認へ進む" }).click();
  await expect(page.getByRole("alert")).toContainText("生年月日");
  await fillBirth(page, { y: "2999", m: "1", d: "1", accuracy: "不明" });
  await page.getByRole("button", { name: "確認へ進む" }).click();
  await expect(page.getByRole("alert")).toContainText("未来");
  await fillBirth(page, { y: "2001", m: "2", d: "30" });
  await page.getByRole("button", { name: "確認へ進む" }).click();
  await expect(page.getByRole("alert")).toContainText("実在");
});

test("端末保存は選んだときだけで、削除できる", async ({ page }) => {
  await toResults(page, SYNTHETIC);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole("button", { name: "この端末に保存する" }).click();
  expect(await page.evaluate(() => localStorage.length)).toBe(1);
  await page.goto("./");
  await page.reload();
  await page.getByRole("button", { name: "読み込む" }).click();
  await expect(page.getByLabel("年(西暦)")).toHaveValue("2000");
  await page.getByRole("button", { name: "削除する" }).click();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test("読み込み直すと入力も結果も残らない", async ({ page }) => {
  await toResults(page, SYNTHETIC);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "出生情報を入力する" })).toBeVisible();
  await expect(page.getByLabel("年(西暦)")).toHaveValue("");
});

test("このサイトについて: ライセンスと出典に到達できる", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "このサイトについて" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "このサイトについて" })).toBeVisible();
  for (const name of ["ライセンス全文", "第三者の依存物", "地名・時刻データの出典"]) {
    const href = await page.getByRole("link", { name }).getAttribute("href");
    const r = await page.request.get(new URL(href!, page.url()).href);
    expect(r.status(), name).toBe(200);
  }
  await expect(page.getByText("GeoNames(CC BY 4.0)")).toBeVisible();
});

test("スマホ幅でも横にはみ出さない", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("./");
  const over = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(await over()).toBeLessThanOrEqual(0);
  await toResults(page, SYNTHETIC);
  for (const tab of ["遺伝子易経", "西洋占星術", "インド占星術", "数秘術"]) {
    await page.getByRole("link", { name: tab, exact: true }).first().click();
    expect(await over(), tab).toBeLessThanOrEqual(0);
  }
  await page.getByRole("link", { name: "ライフパス 4" }).click();
  expect(await over()).toBeLessThanOrEqual(0);
});
