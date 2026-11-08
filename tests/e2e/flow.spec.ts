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
  const want: Record<string, string> = { ライフワーク: "38.1", 進化: "39.1", 輝き: "48.3", 目的: "21.3", 引き寄せ: "29.3", "知能指数（IQ）": "34.2", "心の知能指数（EQ）": "30.4", "魂の知能指数（SQ）": "29.5", コア: "26.6", 天職: "26.6", 文化: "27.1", パール: "42.5" };
  for (const [label, value] of Object.entries(want)) {
    await expect(page.getByRole("link", { name: `${label} ${value}` })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "公式サイト(日本語)" })).toHaveAttribute("href", "https://genekeys-japan.jp/");
  await page.getByRole("link", { name: "インド占星術", exact: true }).click();
  await expect(page.getByText("スヴァーティー 第3パーダ")).toBeVisible();
  await page.getByRole("link", { name: "西洋占星術", exact: true }).click();
  await expect(page.getByRole("link", { name: /ASC 牡羊座 23\.\d\d°/ })).toBeVisible();
  await page.getByRole("link", { name: "数秘術", exact: true }).click();
  await expect(page.getByRole("link", { name: "ライフパス 4" })).toBeVisible();
  await expect(page.getByText("2 + 0 + 0 + 0 + 0 + 1 + 0 + 1 = 4")).toBeVisible();
  expect(errors).toEqual([]);
});

test("詳細は解説準備中でも動き、辞典と公式への案内がある", async ({ page }) => {
  await toResults(page, SYNTHETIC);
  await page.getByRole("link", { name: "ライフワーク 38.1" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "ライフワーク" })).toBeVisible();
  if (!process.env.E2E_BASE) await expect(page.getByText("解説準備中").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /^第38の鍵/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "第38の鍵を64卦辞典で読む" })).toHaveAttribute("href", /iching\/#ich-hex-38$/);
  await expect(page.getByRole("link", { name: "公式サイト(日本語)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "個別コーチングについて見る" })).toHaveAttribute("href", /session\/coaching-session\/$/);
  await expect(page.getByRole("link", { name: "お問い合わせ" })).toHaveAttribute("href", /inquiry\/$/);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "計算結果の概要" })).toBeVisible();
});

test("時刻不明は数秘のみ計算し、正午で埋めない", async ({ page }) => {
  await toConfirm(page, { y: "2000", m: "1", d: "1", accuracy: "不明" });
  await page.getByRole("button", { name: "この条件で計算する" }).click();
  await expect(page.getByRole("heading", { name: "計算結果の概要" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ライフパス 4" })).toBeVisible();
  await expect(page.getByText("この体系の計算には出生時刻が必要です。")).toHaveCount(4);
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

test("チェックしたときだけ保存し、次回は入力済みで開き、外すと消える", async ({ page }) => {
  await toResults(page, SYNTHETIC);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);

  await page.goto("./");
  const box = page.getByLabel("入力情報をこの端末に保存する");
  await expect(box).not.toBeChecked();
  await fillBirth(page, SYNTHETIC);
  await box.check();
  await page.getByRole("button", { name: "確認へ進む" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "計算の条件を確認する" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(1);

  await page.reload();
  await expect(page.getByLabel("年(西暦)")).toHaveValue("2000");
  await expect(page.getByLabel("時刻", { exact: true })).toHaveValue("12:00");
  await expect(page.getByText("東京都千代田区")).toBeVisible();
  await expect(box).toBeChecked();
  await page.getByRole("button", { name: "確認へ進む" }).click();
  await page.getByRole("button", { name: "この条件で計算する" }).click();
  await expect(page.getByRole("link", { name: /^ライフパス 4/ })).toBeVisible();

  await page.goto("./");
  await page.reload();
  await box.uncheck();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.reload();
  await expect(page.getByLabel("年(西暦)")).toHaveValue("");
});

test("時刻不明と出生地不明の入力も保存できる", async ({ page }) => {
  await page.goto("./");
  await fillBirth(page, { y: "2000", m: "1", d: "1", accuracy: "不明" });
  await page.getByLabel("入力情報をこの端末に保存する").check();
  await page.getByRole("button", { name: "確認へ進む" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "計算の条件を確認する" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("不明", { exact: true })).toBeChecked();
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

test("すべての結果と体系別の結果をコピーできる", async ({ page }) => {
  // ブラウザごとの権限の差を避けるため、書き込まれた文字列を記録して確かめる
  await page.addInitScript(() => {
    (window as unknown as { copied: string[] }).copied = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t: string) => { (window as unknown as { copied: string[] }).copied.push(t); } } });
  });
  await toResults(page, SYNTHETIC);
  const last = () => page.evaluate(() => (window as unknown as { copied: string[] }).copied.at(-1) ?? "");
  await page.getByRole("button", { name: "すべての分析結果をコピー" }).click();
  await expect(page.getByRole("button", { name: "コピーしました" })).toBeVisible();
  const all = await last();
  for (const x of ["■ 遺伝子易経", "■ 西洋占星術", "■ インド占星術", "■ 数秘術", "38.1", "ライフパス: 4"]) expect(all).toContain(x);
  expect(all).toContain("生年月日: 2000-01-01");
  expect(all).toContain("出生時刻: 12:00");
  expect(all).toContain("出生地: 東京都千代田区");
  await expect(page.getByText("コピーには生年月日、時刻、出生地と解説の本文が含まれます。")).toBeVisible();

  await expect(page.getByText("コピーしてAIでの分析などでご活用ください。")).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI鑑定用プロンプト生成" })).toBeVisible();
  const patterns: [string, string][] = [["総合的な鑑定", "総合的に鑑定"], ["占術ごとの鑑定", "占術ごとに分けて"], ["魂の目的とカルマ的な課題", "カルマ的な課題を読み解いて"], ["人生の変曲点と1年ごとの運勢", "1年ごとの運勢を読み解いて"], ["7年周期の振り返り", "一度に1つだけ質問"]];
  for (const [name, phrase] of patterns) {
    await page.getByRole("button", { name }).click();
    await expect.poll(last).toContain(phrase);
    // 完了の案内が次のボタンに隠れないこと
    const status = page.locator(".prompt-buttons .copy-status").filter({ hasText: "コピーしました" }).first();
    await expect(status).toBeVisible();
    const overlaps = await status.evaluate((el) => {
      const a = el.getBoundingClientRect();
      return Array.from(document.querySelectorAll(".prompt-buttons .copy-btn")).filter((b) => {
        const r = b.getBoundingClientRect();
        return a.left < r.right && r.left < a.right && a.top < r.bottom && r.top < a.bottom;
      }).length;
    });
    expect(overlaps).toBe(0);
    const prompt = await last();
    expect(prompt).toContain("# 鑑定内容");
    expect(prompt).toContain("生年月日: 2000-01-01");
    expect(prompt).toContain("■ 数秘術");
  }

  await page.getByRole("button", { name: "遺伝子易経の観照サポート" }).click();
  await expect.poll(last).toContain("観照に寄り添う案内役");
  expect(await last()).toContain("■ 遺伝子易経");
  expect(await last()).not.toContain("■ 数秘術");

  await page.getByRole("button", { name: "西洋占星術の分析結果をコピー" }).click();
  const card = await last();
  expect(card).toContain("■ 西洋占星術");
  expect(card).not.toContain("■ 遺伝子易経");

  await page.getByRole("navigation", { name: "体系の切り替え" }).getByRole("link", { name: "遺伝子易経", exact: true }).click();
  await expect(page.getByRole("heading", { name: "AI観照サポート用プロンプト生成" })).toBeVisible();
  await expect(page.getByRole("button", { name: /鑑定$/ })).toHaveCount(0);
  await page.getByRole("button", { name: "観照をサポートするプロンプト" }).click();
  await expect.poll(last).toContain("鑑定や診断ではなく");

  await page.getByRole("link", { name: "インド占星術", exact: true }).first().click();
  await page.getByRole("button", { name: "インド占星術の分析結果をコピー" }).click();
  const tab = await last();
  expect(tab).toContain("■ インド占星術");
  expect(tab).toContain("スヴァーティー");
  expect(tab).not.toContain("■ 数秘術");
  await page.getByRole("button", { name: "インド占星術の鑑定" }).click();
  await expect(page.getByText("プロンプトと鑑定内容をコピーしました。")).toBeVisible();
  const tabPrompt = await last();
  expect(tabPrompt).toContain("あなたはインド占星術に詳しい鑑定士です");
  expect(tabPrompt).not.toContain("占術ごとに分けて");
  expect(tabPrompt).not.toContain("遺伝子易経");
  expect(tabPrompt).toContain("■ インド占星術");
  expect(tabPrompt).not.toContain("■ 数秘術");
});

test("結果の画面にセッションの案内があり、コピーの文章には入らない", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { copied: string[] }).copied = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t: string) => { (window as unknown as { copied: string[] }).copied.push(t); } } });
  });
  await toResults(page, SYNTHETIC);
  for (const tab of ["概要", "遺伝子易経", "西洋占星術", "秘教占星術", "インド占星術", "数秘術"]) {
    await page.getByRole("navigation", { name: "体系の切り替え" }).getByRole("link", { name: tab, exact: true }).click();
    await expect(page.getByRole("heading", { name: "知ったことを、現実の変化につなげるために" })).toBeVisible();
    await expect(page.getByRole("link", { name: "個別コーチングについて見る" })).toHaveAttribute("href", /session\/coaching-session\/$/);
    await expect(page.locator(".session-invite").getByRole("link", { name: "お問い合わせ" })).toHaveAttribute("href", /inquiry\/$/);
  }
  await page.getByRole("navigation", { name: "体系の切り替え" }).getByRole("link", { name: "概要", exact: true }).click();
  await page.getByRole("button", { name: "すべての分析結果をコピー" }).click();
  await page.getByRole("button", { name: "総合的な鑑定" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { copied: string[] }).copied.length)).toBe(2);
  const all = await page.evaluate(() => (window as unknown as { copied: string[] }).copied.join("\n"));
  expect(all).not.toContain("コーチング");
  expect(all).not.toContain("お問い合わせ");
});

test("解説辞典へ11の番号を渡す", async ({ page }) => {
  await toResults(page, SYNTHETIC);
  const want = "38.1 39.1 48.3 21.3 29.3 34.2 30.4 29.5 26.6 27.1 42.5";
  for (const scope of ["overview", "gene_keys"]) {
    if (scope === "gene_keys") await page.getByRole("navigation", { name: "体系の切り替え" }).getByRole("link", { name: "遺伝子易経", exact: true }).click();
    const link = page.getByRole("link", { name: /解説辞典で詳しく見る/ });
    await expect(link).toHaveCount(1);
    const url = new URL((await link.getAttribute("href"))!);
    expect(url.origin + url.pathname).toBe("https://morikawatakashi.com/iching/");
    // 番号はサーバーや GA4 に渡らない # で渡す
    expect(url.search).toBe("");
    expect(decodeURIComponent(url.hash)).toBe(`#q=${want}`);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noreferrer/);
  }
});

test("時刻不明では解説辞典へのボタンを出さない", async ({ page }) => {
  await toConfirm(page, { y: "2000", m: "1", d: "1", accuracy: "不明" });
  await page.getByRole("button", { name: "この条件で計算する" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "計算結果の概要" })).toBeVisible();
  await expect(page.getByRole("link", { name: /解説辞典で詳しく見る/ })).toHaveCount(0);
});

test("時刻不明の体系にはコピーボタンを出さない", async ({ page }) => {
  await toConfirm(page, { y: "2000", m: "1", d: "1", accuracy: "不明" });
  await page.getByRole("button", { name: "この条件で計算する" }).click();
  await expect(page.getByRole("button", { name: "数秘術の分析結果をコピー" })).toBeVisible();
  await expect(page.getByRole("button", { name: "西洋占星術の分析結果をコピー" })).toHaveCount(0);
  await page.getByRole("link", { name: "西洋占星術", exact: true }).first().click();
  await expect(page.getByRole("button", { name: /分析結果をコピー/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /プロンプト生成/ })).toHaveCount(0);
});

test("このサイトについて: 運営者の文章を HTML として解釈せず表示する", async ({ page }) => {
  // 手元の配信物には解説データがないので、応答を差し替えて確かめる
  await page.route("**/content/ja.json", (r) => r.fulfill({ json: { schemaVersion: 1, records: [{ key: "site.about", locale: "ja", body: "## 見出しA\n\n本文の**強調**と<img src=x onerror=alert(1)>\n\n| 列1 | 列2 |\n|---|---|\n| **値1** | 値2 |", sources: [], rights: { status: "owner_original" }, review: "approved" }] } }));
  await page.goto("./#about");
  await expect(page.getByRole("heading", { level: 2, name: "見出しA" })).toBeVisible();
  await expect(page.locator(".about-article strong").first()).toHaveText("強調");
  await expect(page.locator(".about-article img")).toHaveCount(0);
  await expect(page.getByText("<img src=x onerror=alert(1)>", { exact: false })).toBeVisible();
  await expect(page.getByRole("cell", { name: "値1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "出生情報の扱い" })).toBeVisible();
});

test("スマホ幅でも横にはみ出さない", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("./");
  const over = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(await over()).toBeLessThanOrEqual(0);
  await toResults(page, SYNTHETIC);
  for (const tab of ["遺伝子易経", "西洋占星術", "秘教占星術", "インド占星術", "数秘術"]) {
    await page.getByRole("link", { name: tab, exact: true }).first().click();
    expect(await over(), tab).toBeLessThanOrEqual(0);
  }
  await page.getByRole("link", { name: "ライフパス 4" }).click();
  expect(await over()).toBeLessThanOrEqual(0);
});

test("秘教占星術: チャート、支配星の切り替え、総合的な読み解き、学ぶページ", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { copied: string[] }).copied = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t: string) => { (window as unknown as { copied: string[] }).copied.push(t); } } });
  });
  await toResults(page, SYNTHETIC);
  await page.getByRole("navigation", { name: "体系の切り替え" }).getByRole("link", { name: "秘教占星術", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "秘教占星術" })).toBeVisible();
  // 2000-01-01 12:00 東京: ASC 牡羊座、秘教的支配星は水星
  await expect(page.getByRole("link", { name: /ASC\(魂の方向性\) 牡羊座/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /ASCの秘教的支配星 水星\(第4光線\) 山羊座/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /ヴァルカン 位置算出対象外/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /地球 蟹座 9\.99° 第3ハウス\(象徴的位置\)/ })).toBeVisible();
  const chart = page.getByRole("img", { name: /出生チャート/ });
  await expect(chart).toBeVisible();
  await expect(chart.getByRole("button", { name: "水星(ASCの秘教的支配星)" })).toBeVisible();
  await page.getByRole("button", { name: "通常の支配星", exact: true }).click();
  await expect(chart.getByRole("button", { name: "火星(ASCの通常の支配星)" })).toBeVisible();
  await chart.getByRole("button", { name: "地球" }).click();
  await expect(page.locator(".body-panel")).toContainText("射手座");
  const headings = ["魂が発達させようとする資質", "現在のパーソナリティとの関係", "過去の条件づけと向き合うテーマ", "秘教的支配星が示す成長の方向性", "七光線の観点からの考察", "他者や集団への奉仕の可能性", "日常で意識するとよいこと"];
  for (const h of headings) await expect(page.getByRole("heading", { level: 3, name: h })).toBeVisible();
  await expect(page.locator(".synthesis-card")).toContainText("本人の魂やパーソナリティの光線は、出生チャートだけでは決まらない");
  await page.getByRole("button", { name: "秘教占星術の分析結果をコピー" }).click();
  await page.getByRole("button", { name: "秘教占星術の鑑定" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { copied: string[] }).copied.length)).toBe(2);
  const [copy, prompt] = await page.evaluate(() => (window as unknown as { copied: string[] }).copied);
  expect(copy).toContain("〈総合的な読み解き〉");
  expect(copy).toContain("ヴァルカン: 位置算出対象外");
  expect(copy).not.toContain("■ 西洋占星術");
  expect(prompt).toContain("あなたは秘教占星術に詳しい鑑定士です");
  await page.getByRole("link", { name: "天秤座", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: /天秤座/ })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "秘教占星術" })).toBeVisible();
});

test("秘教占星術: 出生地がなければASCを出さない", async ({ page }) => {
  await page.goto("./");
  await fillBirth(page, { y: "2000", m: "1", d: "1", time: "12:00" });
  await page.getByRole("radio", { name: "わからない" }).check();
  await page.getByRole("button", { name: "確認へ進む" }).click();
  await page.getByRole("button", { name: "この条件で計算する" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "計算結果の概要" })).toBeVisible();
  await page.getByRole("navigation", { name: "体系の切り替え" }).getByRole("link", { name: "秘教占星術", exact: true }).click();
  await expect(page.getByText("出生地がないため、ASCとハウスを推測せずに保留しています。").first()).toBeVisible();
  await expect(page.locator(".items").getByRole("link", { name: /^ASC/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /太陽\(パーソナリティ\) 山羊座/ })).toBeVisible();
});

test("西洋・インド・遺伝子易経にもチャートがあり、選ぶと解説を出す", async ({ page }) => {
  await toResults(page, SYNTHETIC);
  const nav = page.getByRole("navigation", { name: "体系の切り替え" });
  await nav.getByRole("link", { name: "西洋占星術", exact: true }).click();
  const wheel = page.getByRole("img", { name: /西洋占星術の出生チャート/ });
  await expect(wheel).toBeVisible();
  await wheel.getByRole("button", { name: "火星" }).click();
  await expect(page.locator(".body-panel")).toContainText("火星: 水瓶座");
  await expect(page.locator(".body-panel").getByRole("link", { name: "火星のページで詳しく読む" })).toBeVisible();
  await nav.getByRole("link", { name: "インド占星術", exact: true }).click();
  await expect(page.getByRole("heading", { name: "チャート(南インド式)" })).toBeVisible();
  await expect(page.locator(".rasi-cell.is-lagna")).toHaveCount(1);
  await page.getByRole("group", { name: /ラーシ・チャート/ }).getByRole("button", { name: /^月/ }).click();
  await expect(page.locator(".body-panel")).toContainText("月");
  await nav.getByRole("link", { name: "遺伝子易経", exact: true }).click();
  await expect(page.getByRole("img", { name: /遺伝子易経のチャート/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^天職・コア 26\.6$/ })).toBeVisible();
  await page.getByRole("button", { name: /ライフワーク\s*38\.1/ }).click();
  await expect(page.locator(".body-panel")).toContainText("ライフワーク: 38.1");
});

test("プロンプトの長さ: 詳しくは上位モデルをすすめ、短くは主要な項目だけをコピーする", async ({ page }) => {
  // 1万字を超える詳しいプロンプトにするため、長い解説を差し込む(手元の配信物には解説データがない)
  await page.route("**/content/ja.json", (r) => r.fulfill({ json: { schemaVersion: 1, records: [{ key: "west.planet.sun", locale: "ja", body: "太陽の長い解説。".repeat(1500), sources: [], rights: { status: "owner_original" }, review: "approved" }] } }));
  await page.addInitScript(() => {
    (window as unknown as { copied: string[] }).copied = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t: string) => { (window as unknown as { copied: string[] }).copied.push(t); } } });
  });
  await toResults(page, SYNTHETIC);
  const box = page.locator(".prompt-box");
  await expect(box.getByRole("radio", { name: "詳しく(解説つき)" })).toBeChecked();
  await expect(box.locator(".prompt-length-note")).toContainText("上位モデル");
  await box.getByRole("radio", { name: "短く(主要な項目のみ)" }).check();
  await expect(box.locator(".prompt-length-note")).toContainText("主要な項目の値");
  await page.getByRole("button", { name: "総合的な鑑定" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { copied: string[] }).copied.length)).toBe(1);
  const t = await page.evaluate(() => (window as unknown as { copied: string[] }).copied[0]!);
  expect(t).toContain("# 鑑定内容");
  expect(t).not.toContain("# 進め方");
  expect(t).not.toContain("〈解説〉");
  expect(t).toContain("ライフパス: 4");
  expect(t.length).toBeLessThan(2000);
});

test("プロンプトの長さ: 1万字未満のタブでは上位モデルをすすめない", async ({ page }) => {
  await toResults(page, SYNTHETIC);
  await page.getByRole("navigation", { name: "体系の切り替え" }).getByRole("link", { name: "西洋占星術", exact: true }).click();
  const note = page.locator(".prompt-box .prompt-length-note");
  await expect(note).toContainText("このプロンプトは約");
  await expect(note).not.toContainText("上位モデル");
});
