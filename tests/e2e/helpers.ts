// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, type Page } from "@playwright/test";

export interface Birth { y: string; m: string; d: string; time?: string; accuracy?: string; place?: string; pick?: string }
export async function fillBirth(page: Page, b: Birth) {
  await page.getByLabel("年(西暦)").fill(b.y);
  await page.getByLabel("月", { exact: true }).selectOption(b.m);
  await page.getByLabel("日", { exact: true }).selectOption(b.d);
  if (b.accuracy) await page.getByLabel(b.accuracy, { exact: true }).check();
  if (b.time) await page.getByLabel("時刻", { exact: true }).fill(b.time);
  if (b.place) {
    await page.getByLabel(/市区町村名|都市名/).fill(b.place);
    await page.getByRole("button", { name: new RegExp(`^${b.pick ?? b.place}`) }).first().click();
  }
}
export async function toConfirm(page: Page, b: Birth) {
  await page.goto("./");
  await fillBirth(page, b);
  await page.getByRole("button", { name: "確認へ進む" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "計算の条件を確認する" })).toBeVisible();
}
export async function toResults(page: Page, b: Birth) {
  await toConfirm(page, b);
  await page.getByRole("button", { name: "この条件で計算する" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "計算結果の概要" })).toBeVisible();
}
export const SYNTHETIC: Birth = { y: "2000", m: "1", d: "1", time: "12:00", place: "東京都千代田区" };
