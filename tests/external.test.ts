// SPDX-License-Identifier: AGPL-3.0-or-later
// 外部の資料・独立した計算との照合。実在の人の情報は使わない。詳細は docs/VALIDATION.md。
import fs from "node:fs";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import type { UtcParts } from "../src/core/types";
import { keyLine } from "../src/modules/gene_keys/index";
import { calculate } from "../src/engine/calculate";
import type { NumerologyData } from "../src/modules/numerology/index";
import { confirmBirth } from "../src/time/resolve";
import type { TzData } from "../src/time/tz";
import { engine, norm } from "./helpers";

const gz = (f: string) => JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(`./fixtures/${f}`, import.meta.url))).toString());
const angle = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const rad = Math.PI / 180;

describe("NASA JPL Horizons(地心視位置)", () => {
  const h = gz("horizons.json.gz");
  it.each(Object.keys(h.bodies).map((n, i) => [n, i] as const))("%s は1秒角未満で一致", (name, body) => {
    expect(h.jd_ut.length).toBe(40);
    h.jd_ut.forEach((jd: number, k: number) => {
      const diff = angle(engine.position(jd, body).longitude, h.bodies[name][k]) * 3600;
      expect(diff, `${name} ${jd}`).toBeLessThan(1);
    });
  });
});

describe("公式の座標表(Gene Keys Astrological Coordinates)", () => {
  // 図版の表を転記: 星座ごとの列 [区分の開始度数, 鍵番号×4]。表の度数は分単位に丸められている
  const SIGN = { gemini: 60, virgo: 150, sagittarius: 240, pisces: 330, cancer: 90, libra: 180, capricorn: 270, aries: 0, leo: 120, scorpio: 210, aquarius: 300, taurus: 30 };
  const ROWS: [(keyof typeof SIGN)[], number, number[]][] = [];
  const add = (signs: (keyof typeof SIGN)[], rows: [number, number, number[]][]) => rows.forEach(([d, m, k]) => ROWS.push([signs, d + m / 60, k]));
  add(["gemini", "virgo", "sagittarius", "pisces"], [[0, 7, [20, 59, 34, 55]], [5, 45, [16, 40, 9, 37]], [11, 22, [35, 64, 5, 63]], [17, 0, [45, 47, 26, 22]], [22, 37, [12, 6, 11, 36]]]);
  // 28°15' と 26°22' は前の星座から始まるため、星座の起点からの負の度数で表す
  add(["cancer", "libra", "capricorn", "aries"], [[-1, -45, [15, 46, 10, 25]], [3, 52, [52, 18, 58, 17]], [9, 30, [39, 48, 38, 21]], [15, 7, [53, 57, 54, 51]], [20, 45, [62, 32, 61, 42]]]);
  add(["leo", "scorpio", "aquarius", "taurus"], [[-3, -38, [56, 50, 60, 3]], [2, 0, [31, 28, 41, 27]], [7, 37, [33, 44, 19, 24]], [13, 15, [7, 1, 13, 2]], [18, 52, [4, 43, 49, 23]], [24, 30, [29, 14, 30, 8]]]);
  it("表の全64鍵が実装の黄経と一致する", () => {
    const seen = new Set<number>();
    for (const [signs, start, keys] of ROWS) {
      signs.forEach((s, i) => {
        // 丸めの影響を避けるため区間の中央で確かめる
        const lon = SIGN[s] + start + 2.8125;
        expect(keyLine(lon).key, `${s} ${start}`).toBe(keys[i]);
        seen.add(keys[i]!);
      });
    }
    expect(seen.size).toBe(64);
  });
  it("第41の鍵は水瓶座2度00分から始まる", () => expect(keyLine(302)).toMatchObject({ key: 41, line: 1 }));
});

describe("ASC・MC・プラシーダスの独立計算", () => {
  // Swiss Ephemeris を使わず、平均恒星時・黄道傾斜角・主要な章動項だけで計算する
  function sky(jd: number) {
    const T = (jd - 2451545) / 36525;
    const om = (125.04452 - 1934.136261 * T) * rad, L = (280.4665 + 36000.7698 * T) * rad, Lm = (218.3165 + 481267.8813 * T) * rad;
    const dpsi = (-17.2 * Math.sin(om) - 1.32 * Math.sin(2 * L) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * om)) / 3600;
    const deps = (9.2 * Math.cos(om) + 0.57 * Math.cos(2 * L) + 0.1 * Math.cos(2 * Lm) - 0.09 * Math.cos(2 * om)) / 3600;
    const eps = 23.43929111 - (46.815 * T) / 3600 + deps;
    const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T;
    return { eps: eps * rad, gast: gmst + dpsi * Math.cos(eps * rad) };
  }
  const norm = (x: number) => ((x % 360) + 360) % 360;
  function angles(jd: number, lat: number, lon: number) {
    const { eps, gast } = sky(jd);
    const ramc = norm(gast + lon) * rad;
    const mc = norm(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / rad);
    const asc = norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat * rad) * Math.sin(eps))) / rad);
    const lonOfRa = (ra: number) => Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(eps));
    const cusp = (base: number, frac: number, nocturnal: boolean) => {
      let ra = ramc + base * rad;
      for (let i = 0; i < 200; i++) {
        const dec = Math.asin(Math.sin(eps) * Math.sin(lonOfRa(ra)));
        const ad = Math.asin(Math.tan(lat * rad) * Math.tan(dec)) / rad;
        ra = ramc + (nocturnal ? 180 - frac * (90 - ad) : frac * (90 + ad)) * rad;
      }
      return norm(lonOfRa(ra) / rad);
    };
    return { asc, mc, c11: cusp(30, 1 / 3, false), c12: cusp(60, 2 / 3, false), c2: cusp(120, 2 / 3, true), c3: cusp(150, 1 / 3, true) };
  }
  it("合成300地点で0.005度以内", () => {
    const cases = gz("oracle.json.gz").cases.filter((c: any) => c.input.latitude !== undefined && Math.abs(c.input.latitude) < 60).slice(0, 300);
    expect(cases.length).toBe(300);
    let worst = 0;
    for (const c of cases) {
      const u = /^(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/.exec(c.utc)!.slice(1, 7).map(Number) as unknown as UtcParts;
      const jd = engine.utcToJdUt(u);
      const { latitude: lat, longitude: lon } = c.input;
      const h = engine.houses(jd, lat, lon, "P")!;
      const a = angles(jd, lat, lon);
      for (const [mine, theirs] of [[a.asc, h.ascendant], [a.mc, h.mc], [a.c11, h.cusps[10]], [a.c12, h.cusps[11]], [a.c2, h.cusps[1]], [a.c3, h.cusps[2]]] as [number, number][]) {
        worst = Math.max(worst, angle(mine, theirs));
      }
    }
    expect(worst).toBeLessThan(0.005);
  });
});

describe("ラヒリのアヤナムサ", () => {
  it("定義値: 1956年3月21日に 23°15'00.658\"(章動を除いた平均値との差は章動の範囲内)", () => {
    const def = 23 + 15 / 60 + 0.658 / 3600;
    expect(Math.abs(engine.ayanamsa(2435553.5) - def) * 3600).toBeLessThan(20);
  });
  it("スピカが2000年にサイデリアル約180度になる(公式の記載 179°58'58\")", () => {
    // ヒッパルコス星表のスピカの座標を J2000 黄道座標へ変換し、Swiss Ephemeris を使わずに黄経を求める
    const ra = ((13 + 25 / 60 + 11.579 / 3600) * 15) * rad, dec = -(11 + 9 / 60 + 40.75 / 3600) * rad, eps = 23.4392911 * rad;
    const lon = Math.atan2(Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps), Math.cos(ra)) / rad;
    const sid = (((lon + 360) % 360) - engine.ayanamsa(2451545));
    expect(Math.abs(sid - (179 + 58 / 60 + 58 / 3600))).toBeLessThan(0.01);
  });
});

describe("数秘術: 全桁を足す方式", () => {
  const life = async (date: string) => {
    const r = await calculate(norm({ date, timeAccuracy: "unknown" }), engine, ["numerology"]);
    return r.numerology!.data as NumerologyData;
  };
  it("出典(bis)の計算例: 1999年12月26日は 39 → 12 → 3", async () => {
    const n = await life("1999-12-26");
    expect(n.sumTrace).toEqual([39, 12, 3]);
    expect(n.lifePath).toBe(3);
  });
  it.each([["1970-02-03", 22, [22]], ["1980-09-06", 33, [33]], ["1991-07-02", 11, [29, 11]]])("%s は途中や最後のマスターナンバーで止まる", async (date, want, trace) => {
    const n = await life(date as string);
    expect(n.lifePath).toBe(want);
    expect(n.sumTrace).toEqual(trace);
  });
  it("年月日を別々に還元する方式と結果が異なる例", async () => {
    // 別々に還元すると 9+8+5=22 だが、全桁の合計は 31 → 4
    const n = await life("1980-08-23");
    expect(n.digits.join("")).toBe("19800823");
    expect(n.sumTrace).toEqual([31, 4]);
  });
  it.each([[11, 11], [22, 22], [29, 11], [19, 1], [14, 5]])("誕生数: %i日は %i(出典の才能数の規則)", async (day, want) => {
    const n = await life(`2000-01-${String(day).padStart(2, "0")}`);
    expect(n.birthday).toBe(want);
  });
});

describe("日本の夏時間: 法律の実施期間", () => {
  const tz: TzData = JSON.parse(fs.readFileSync(new URL("../public/data/tzdata.json", import.meta.url), "utf8"));
  const c = (date: string, time: string) => confirmBirth({ date, time, timezone: "Asia/Tokyo" }, tz);
  it.each([["1948-05-02", "1948-09-12"], ["1949-04-03", "1949-09-11"], ["1950-05-07", "1950-09-10"], ["1951-05-06", "1951-09-09"]])("%s 開始、%s 終了", (start, end) => {
    expect(c(start, "00:30").status).toBe("nonexistent");
    expect(c(start, "01:30")).toMatchObject({ status: "ok", time: { offset: "+10:00", isDst: true } });
    expect(c(end, "00:30").status).toBe("ambiguous");
    expect(c(end, "01:30")).toMatchObject({ status: "ok", time: { offset: "+09:00", isDst: false } });
  });
  it("資料が食い違う1951年の終了日は確認を促す", () => {
    expect(c("1951-09-08", "12:00")).toMatchObject({ review: true, message: expect.stringContaining("1951年") });
    expect(c("1951-09-07", "12:00")).toMatchObject({ review: false });
    expect(c("1951-09-09", "02:00")).toMatchObject({ review: false });
  });
});
