// SPDX-License-Identifier: AGPL-3.0-or-later
// 秘教占星術: ベイリーの表との一致、西洋占星術の計算との一致、地球とヴァルカンの扱い、判定しないこと。
import fs from "node:fs";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import type { UtcParts } from "../src/core/types";
import { SIGN_IDS, zodiac } from "../src/core/zodiac";
import { calculate } from "../src/engine/calculate";
import { CROSSES, crossOf, PLANET_RAYS, RAY_SIGNS, RULERS, signRays, SOURCES } from "../src/modules/esoteric/data";
import type { EsotericData } from "../src/modules/esoteric/index";
import type { WesternData } from "../src/modules/western/index";
import { confirmBirth, resolveBirth } from "../src/time/resolve";
import type { TzData } from "../src/time/tz";
import { BASE, BASE_UTC, engine, norm, TODAY } from "./helpers";

const TZ: TzData = JSON.parse(fs.readFileSync(new URL("../public/data/tzdata.json", import.meta.url), "utf8"));
const TOKYO = { lat: 35.6812, lon: 139.7671 };
/** 東京の現地時刻からタイムゾーンを通して入力を作る */
const at = (date: string, time: string) => resolveBirth({ date, time, timezone: "Asia/Tokyo", place: TOKYO }, TZ, { today: TODAY, toJdUt: (u: UtcParts) => engine.utcToJdUt(u) });
const angle = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const run = async (ctx: ReturnType<typeof norm>) => {
  const r = await calculate(ctx, engine, ["western", "esoteric"]);
  return { r, w: r.western!.data as WesternData | null, e: r.esoteric!.data as EsotericData | null };
};

describe("マスターデータ", () => {
  it("表VI: 12星座すべてで3つの支配星が原典どおり", () => {
    // 牡羊座から魚座。通常 / 秘教 / ハイアラーキ
    const table = [
      ["mars", "mercury", "uranus"], ["venus", "vulcan", "vulcan"], ["mercury", "venus", "earth"], ["moon", "neptune", "neptune"],
      ["sun", "sun", "sun"], ["mercury", "moon", "jupiter"], ["venus", "uranus", "saturn"], ["mars", "mars", "mercury"],
      ["jupiter", "earth", "mars"], ["saturn", "saturn", "venus"], ["uranus", "jupiter", "moon"], ["jupiter", "pluto", "pluto"],
    ];
    expect(Object.keys(RULERS)).toEqual([...SIGN_IDS]);
    SIGN_IDS.forEach((s, i) => expect([RULERS[s].orthodox, RULERS[s].esoteric, RULERS[s].hierarchical], s).toEqual(table[i]));
  });
  it("惑星の光線と聖なる惑星の区分", () => {
    const rays = { vulcan: 1, pluto: 1, sun: 2, jupiter: 2, earth: 3, saturn: 3, moon: 4, mercury: 4, venus: 5, mars: 6, neptune: 6, uranus: 7 };
    for (const [b, ray] of Object.entries(rays)) expect(PLANET_RAYS[b as keyof typeof PLANET_RAYS].ray, b).toBe(ray);
    const sacred = Object.entries(PLANET_RAYS).filter(([, v]) => v.sacred).map(([k]) => k).sort();
    expect(sacred).toEqual(["jupiter", "mercury", "neptune", "saturn", "uranus", "venus", "vulcan"]);
  });
  it("星座を通じて働く光線は各光線3星座で、複数の光線をもつ星座がある", () => {
    for (const signs of Object.values(RAY_SIGNS)) expect(signs).toHaveLength(3);
    expect(signRays("capricorn")).toEqual([1, 3, 7]);
    expect(signRays("sagittarius")).toEqual([4, 5, 6]);
    expect(signRays("aquarius")).toEqual([5]);
    for (const s of SIGN_IDS) expect(signRays(s).length, s).toBeGreaterThan(0);
  });
  it("三つの十字は4星座ずつで重ならない", () => {
    expect(Object.values(CROSSES).flat().sort()).toEqual([...SIGN_IDS].sort());
    expect(crossOf("gemini")).toBe("mutable");
    expect(crossOf("leo")).toBe("fixed");
    expect(crossOf("capricorn")).toBe("cardinal");
  });
  it("すべての出典に章とページがある", () => {
    for (const s of Object.values(SOURCES)) {
      expect(s.chapter).toBeTruthy();
      expect(s.pdfPages.length).toBeGreaterThan(0);
    }
  });
  it("星座の境界は30°ちょうどで次の星座になる", () => {
    expect(zodiac(29.999999).signId).toBe("aries");
    expect(zodiac(30).signId).toBe("taurus");
    expect(zodiac(359.999999).signId).toBe("pisces");
    expect(zodiac(360).signId).toBe("aries");
  });
});

describe("西洋占星術の計算との一致", () => {
  it("太陽・月・ASCとハウスが西洋占星術と同じ値", async () => {
    const { w, e } = await run(norm(BASE, BASE_UTC));
    expect(e!.points.sun!.position.longitude).toBe(w!.planets.sun!.longitude);
    expect(e!.points.moon!.position.longitude).toBe(w!.planets.moon!.longitude);
    expect(e!.points.asc!.position.longitude).toBe(w!.ascendant!.longitude);
    for (const [k, p] of Object.entries(w!.planets)) {
      const b = e!.bodies[k as keyof EsotericData["bodies"]].placement;
      expect(b.status).toBe("calculated");
      if (b.status === "calculated") {
        expect(b.position.longitude).toBe(p.longitude);
        expect(b.house).toBe(p.house);
      }
    }
  });
  it("照合用の1,000件でも、太陽・月・ASCの星座と十字・光線・支配星が一致する", async () => {
    const fx = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL("./fixtures/oracle.json.gz", import.meta.url))).toString());
    for (const c of fx.cases) {
      const i = c.input;
      const m = /^(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/.exec(c.utc)!;
      const utc = m.slice(1, 7).map(Number) as unknown as UtcParts;
      const ctx = norm({ date: i.date, time: i.time, timeAccuracy: i.time_accuracy, timezone: i.timezone, place: i.latitude === undefined ? undefined : { lat: i.latitude, lon: i.longitude } }, utc);
      const { r, w, e } = await run(ctx);
      expect(r.esoteric!.status).toBe(r.western!.status);
      if (!w) { expect(e).toBeNull(); continue; }
      const py = c.modules.western.data;
      expect(angle(e!.points.sun!.position.longitude, py.planets.sun.longitude)).toBeLessThan(2e-8);
      expect(e!.points.sun!.position.sign).toBe(py.planets.sun.sign);
      expect(e!.points.moon!.position.sign).toBe(py.planets.moon.sign);
      if (w.ascendant) {
        expect(e!.points.asc!.position.signId).toBe(w.ascendant.signId);
        const s = w.ascendant.signId as keyof typeof RULERS;
        expect(e!.points.asc!.rulers).toEqual(RULERS[s]);
        expect(e!.points.asc!.cross).toBe(crossOf(s));
        expect(e!.points.asc!.signRays).toEqual(signRays(s));
      } else {
        expect(e!.points.asc).toBeUndefined();
      }
    }
  }, 120_000);
});

describe("地球とヴァルカン", () => {
  it("地球の黄経は太陽の180°反対側で、導出した位置として扱う", async () => {
    for (const date of ["2000-01-01", "2000-03-20", "2000-06-21", "2000-09-22", "2000-12-21", "1975-08-15"]) {
      const { w, e } = await run(at(date, "12:00"));
      const earth = e!.bodies.earth.placement;
      expect(earth.status).toBe("derived");
      if (earth.status === "derived") {
        expect(angle(earth.position.longitude, w!.planets.sun!.longitude)).toBeCloseTo(180, 9);
        expect(earth.house).toBeGreaterThanOrEqual(1);
      }
      expect(e!.bodies.earth.aspects.some((a) => a.other === "sun")).toBe(false);
    }
  });
  it("ヴァルカンには位置の数値を出さない", async () => {
    const { r, e } = await run(norm(BASE, BASE_UTC));
    expect(e!.bodies.vulcan.placement).toEqual({ status: "not_calculated" });
    expect(e!.bodies.vulcan.aspects).toEqual([]);
    const item = r.esoteric!.items.find((i) => i.id === "body_vulcan")!;
    expect(item.display).toContain("位置算出対象外");
    expect(item.display).not.toMatch(/\d+\.\d+°/);
    expect(Object.keys(item.value)).not.toContain("degree");
    // 牡牛座ASCの秘教的支配星はヴァルカン。ASCとの角度も出さない
        let found = false;
    for (let h = 0; h < 24 && !found; h++) {
      const t = await run(at("2000-01-01", `${String(h).padStart(2, "0")}:00`));
      if (t.e!.points.asc!.position.signId !== "taurus") continue;
      found = true;
      expect(t.e!.ascRulers.find((x) => x.scheme === "esoteric")).toMatchObject({ body: "vulcan", toAsc: null });
      expect(t.r.esoteric!.items.find((i) => i.id === "asc_ruler_esoteric")!.display).toContain("位置算出対象外");
    }
    expect(found).toBe(true);
  });
  it("月を自動でヴァルカンに置き換えない", async () => {
    const { e } = await run(norm(BASE, BASE_UTC));
    expect(e!.bodies.moon.placement.status).toBe("calculated");
    expect(e!.bodies.moon.ray).toBe(4);
  });
});

describe("入力が足りないとき", () => {
  it("出生時刻が不明なら計算せず、ASCを推測しない", async () => {
    const { r } = await run(norm({ date: "2000-01-01", timeAccuracy: "unknown" }));
    expect(r.esoteric!.status).toBe("unavailable");
    expect(r.esoteric!.missing).toEqual(["time"]);
    expect(r.esoteric!.items).toEqual([]);
  });
  it("出生地がなければASCとハウスを出さず、ほかは計算する", async () => {
    const { r, e } = await run(norm({ date: "2000-01-01", time: "12:00", timezone: "Asia/Tokyo" }, BASE_UTC));
    expect(r.esoteric!.status).toBe("calculated");
    expect(e!.points.asc).toBeUndefined();
    expect(e!.ascMissing).toBe("place");
    expect(e!.ascRulers).toEqual([]);
    const ids = r.esoteric!.items.map((i) => i.id);
    expect(ids).not.toContain("asc");
    expect(ids.some((x) => x.startsWith("asc_"))).toBe(false);
    expect(ids).toContain("sun");
    expect(ids).toContain("sun_ruler_orthodox");
    const earth = e!.bodies.earth.placement;
    expect(earth.status === "derived" && earth.house).toBeFalsy();
  });
  it("おおよその時刻は仮計算になる", async () => {
    const { r } = await run(norm({ ...BASE, timeAccuracy: "approximate" }, BASE_UTC));
    expect(r.esoteric!.status).toBe("provisional");
  });
});

describe("日付・夏時間・タイムゾーン", () => {
  const tz = TZ;
  const opts = { today: TODAY, toJdUt: (u: UtcParts) => engine.utcToJdUt(u) };
  it("日本の夏時間(1950年)は UTC+10 で計算し、西洋占星術と同じ位置になる", async () => {
    expect(confirmBirth({ date: "1950-07-01", time: "10:00", timezone: "Asia/Tokyo" }, tz)).toMatchObject({ time: { offset: "+10:00" } });
    const ctx = resolveBirth({ date: "1950-07-01", time: "10:00", timezone: "Asia/Tokyo", place: { lat: 35.6812, lon: 139.7671 } }, tz, opts);
    expect(ctx.utc).toEqual([1950, 7, 1, 0, 0, 0]);
    const { w, e } = await run(ctx);
    expect(e!.points.asc!.position.longitude).toBe(w!.ascendant!.longitude);
  });
  it("現地では日付が変わっても、UTCの前日として同じ位置になる", async () => {
    const ctx = resolveBirth({ date: "2000-01-01", time: "00:30", timezone: "Asia/Tokyo", place: { lat: 35.6812, lon: 139.7671 } }, tz, opts);
    expect(ctx.utc).toEqual([1999, 12, 31, 15, 30, 0]);
    const { w, e } = await run(ctx);
    expect(e!.points.moon!.position.longitude).toBe(w!.planets.moon!.longitude);
  });
  it("ニューヨークの夏時間開始直後", async () => {
    const ctx = resolveBirth({ date: "2021-03-14", time: "03:30", timezone: "America/New_York", place: { lat: 40.7128, lon: -74.006 } }, tz, opts);
    expect(ctx.utc).toEqual([2021, 3, 14, 7, 30, 0]);
    const { w, e } = await run(ctx);
    expect(e!.points.sun!.position.longitude).toBe(w!.planets.sun!.longitude);
  });
});

describe("判定しないこと", () => {
  it("魂やパーソナリティの光線、イニシエーションの段階、魂の年齢を出さない", async () => {
    const { r, e } = await run(norm(BASE, BASE_UTC));
    const text = JSON.stringify(r.esoteric) + JSON.stringify(e);
    for (const word of ["soulRay", "personalityRay", "initiation", "soulAge", "魂の光線", "パーソナリティの光線", "イニシエーション", "魂の年齢", "段階"]) {
      expect(text, word).not.toContain(word);
    }
    const labels = r.esoteric!.items.map((i) => i.label).join();
    expect(labels).not.toMatch(/主光線|魂の光線|段階/);
  });
});

describe("既存の体系に影響しない", () => {
  it("西洋占星術の項目は秘教占星術を足しても変わらない", async () => {
    const ctx = norm(BASE, BASE_UTC);
    const a = await calculate(ctx, engine, ["western"]);
    const b = await calculate(ctx, engine);
    expect(b.western).toEqual(a.western);
    for (const id of ["gene_keys", "vedic", "numerology"]) expect(b[id]!.items).toEqual((await calculate(ctx, engine, [id]))[id]!.items);
  });
});

describe("チャートの配置", () => {
  it("近い天体の文字が同じ段で重ならない", async () => {
    const { layoutLanes } = await import("../src/ui/charts/Wheel");
    // 山羊座に6天体が集まる場合
    const pts = [270, 272, 275, 276, 279, 283, 300].map((longitude, i) => ({ id: `p${i}`, longitude }));
    const lanes = layoutLanes(pts);
    const r = [138, 112, 88];
    const placed = [...lanes.values()];
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]!, b = placed[j]!;
        if (a.lane !== b.lane) continue;
        const sep = Math.abs(((a.at - b.at + 540) % 360) - 180);
        expect(sep * Math.PI / 180 * r[a.lane]!).toBeGreaterThanOrEqual(26);
      }
    }
  });
});
