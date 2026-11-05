// SPDX-License-Identifier: AGPL-3.0-or-later
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { InputError } from "../src/core/errors";
import { buildJapanIndex, buildWorldIndex, manualPlace, normalizeQuery, searchPlaces, type JapanPlaces, type WorldPlaces } from "../src/places/search";
import type { TzData } from "../src/time/tz";

const load = <T,>(f: string): T => JSON.parse(fs.readFileSync(new URL(`../public/data/${f}`, import.meta.url), "utf8"));
const jp = load<JapanPlaces>("places-jp.json");
const world = load<WorldPlaces>("places-world.json");
const tz = load<TzData>("tzdata.json");
const extra = load<JapanPlaces>("places-jp-extra.json");
const J = buildJapanIndex(jp);
const W = buildWorldIndex(world);
const km = (a: number, b: number, c: number, d: number) => Math.hypot((a - c) * 111, (b - d) * 91);

describe("日本のデータ", () => {
  const current = jp.places.filter((p) => p[4] === 0);
  it("現行の市区町村と行政区を網羅する", () => {
    expect(current.length).toBeGreaterThanOrEqual(1900);
    const prefs = new Set(current.map((p) => /^.+?[都道府県]/.exec(p[0])![0]));
    expect(prefs.size).toBe(47);
    for (const name of ["東京都世田谷区", "北海道札幌市中央区", "埼玉県白岡市", "福岡県那珂川市", "静岡県浜松市中央区", "沖縄県竹富町", "東京都小笠原村"]) {
      expect(current.some((p) => p[0] === name), name).toBe(true);
    }
  });
  it("座標が日本の範囲内で、表示名が重複しない", () => {
    for (const p of [...jp.places, ...extra.places]) {
      expect(p[2]).toBeGreaterThan(20);
      expect(p[2]).toBeLessThan(46);
      expect(p[3]).toBeGreaterThan(122);
      expect(p[3]).toBeLessThan(154);
    }
    expect(new Set(jp.places.map((p) => p[0])).size).toBe(jp.places.length);
    expect(jp.timezone).toBe("Asia/Tokyo");
  });
  it.each([
    ["東京都世田谷区", 35.65, 139.65], ["北海道札幌市", 43.06, 141.35], ["大阪府大阪市", 34.69, 135.5],
    ["福岡県福岡市", 33.59, 130.4], ["沖縄県那覇市", 26.21, 127.68], ["埼玉県白岡市", 36.02, 139.67], ["福岡県那珂川市", 33.5, 130.42],
    ["東京都府中市", 35.67, 139.48], ["広島県府中市", 34.57, 133.24], ["北海道泊村", 43.06, 140.5],
  ])("%s の座標が実際の位置に近い", (name, lat, lon) => {
    const p = current.find((x) => x[0] === name)!;
    expect(km(p[2], p[3], lat, lon), name).toBeLessThan(15);
  });
});

describe("日本語の検索", () => {
  const top = (q: string) => searchPlaces(J, q)[0]?.label;
  it("漢字、かな、カタカナ、全角で引ける", () => {
    for (const q of ["世田谷", "世田谷区", "せたがや", "セタガヤ", "ｾﾀｶﾞﾔ", "東京都世田谷区", " 世田谷 "]) expect(top(q), q).toBe("東京都世田谷区");
  });
  it("同名の自治体を都道府県付きで両方出す", () => {
    const labels = searchPlaces(J, "府中市").map((p) => p.label);
    expect(labels).toEqual(expect.arrayContaining(["東京都府中市", "広島県府中市"]));
  });
  it("現行の市区町村と旧地名・地区名を分けて検索できる", () => {
    expect(jp.places.every((p) => p[4] === 0)).toBe(true);
    expect(extra.places.every((p) => p[4] !== 0)).toBe(true);
    expect(searchPlaces(J, "札幌")[0]!.label).toBe("北海道札幌市");
    const combined = buildJapanIndex({ timezone: jp.timezone, places: [...jp.places, ...extra.places] });
    expect(searchPlaces(combined, "札幌")[0]!.note).toBeUndefined();
    expect(searchPlaces(buildJapanIndex(extra), "牛窓町牛窓")[0]!.note).toBe("地区名");
  });
  it("ヶ・ケ・が の表記ゆれ", () => {
    expect(top("鎌ヶ谷市")).toBe("千葉県鎌ケ谷市");
    expect(top("鎌が谷")).toBe("千葉県鎌ケ谷市");
  });
  it("見つからない・空の入力", () => {
    expect(searchPlaces(J, "存在しない地名あいう")).toEqual([]);
    expect(searchPlaces(J, "  ")).toEqual([]);
  });
  it("件数の上限", () => expect(searchPlaces(J, "市").length).toBe(20));
  it("候補は座標とタイムゾーンを持つ", () => {
    expect(searchPlaces(J, "世田谷")[0]).toMatchObject({ timezone: "Asia/Tokyo", lat: expect.any(Number), lon: expect.any(Number) });
  });
});

describe("海外の検索", () => {
  it.each([["ニューヨーク", "US", "America/New_York"], ["New York", "US", "America/New_York"], ["london", "GB", "Europe/London"], ["ロンドン", "GB", "Europe/London"], ["são paulo", "BR", "America/Sao_Paulo"], ["Sao Paulo", "BR", "America/Sao_Paulo"]])("%s", (q, cc, zone) => {
    const r = searchPlaces(W, q)[0]!;
    expect(r.timezone).toBe(zone);
    expect(r.note).toBe(world.countries[cc]);
  });
  it("人口の多い都市を先に出す", () => expect(searchPlaces(W, "Paris")[0]!.timezone).toBe("Europe/Paris"));
  it("全地点のゾーンが同梱データにある", () => {
    for (const z of world.zones) expect(Object.hasOwn(tz.zones, z), z).toBe(true);
    expect(world.places.every((p) => p[5] !== "JP")).toBe(true);
  });
});

describe("手入力と正規化", () => {
  it("手入力を検証する", () => {
    expect(manualPlace(35, 139, "Asia/Tokyo", tz).timezone).toBe("Asia/Tokyo");
    expect(() => manualPlace(95, 0, "Asia/Tokyo", tz)).toThrow(InputError);
    expect(() => manualPlace(0, 0, "Mars/Base", tz)).toThrow(InputError);
  });
  it("正規化", () => expect(normalizeQuery("Ｓｅｔａｇａｙａ　区")).toBe("setagaya区"));
});
