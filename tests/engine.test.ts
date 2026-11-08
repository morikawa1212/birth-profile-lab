// SPDX-License-Identifier: AGPL-3.0-or-later
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { InputError, EphemerisError } from "../src/core/errors";
import { calculate } from "../src/engine/calculate";
import { SwissEngine } from "../src/engine/swe";
import { keyLine, KEY_ORDER } from "../src/modules/gene_keys/index";
import { nakshatra } from "../src/modules/vedic/index";
import { reduceNumber, type NumerologyData } from "../src/modules/numerology/index";
import { MODULE_LOADERS } from "../src/modules/registry";
import { BASE, BASE_UTC, engine, norm } from "./helpers";

describe("入力検証", () => {
  it.each([
    [{ ...BASE, date: "2000-02-30" }], [{ ...BASE, date: "20000101" }], [{ ...BASE, date: "1899-12-31" }],
    [{ ...BASE, date: "2026-11-06" }], [{ ...BASE, time: "25:00" }], [{ ...BASE, time: "12" }], [{ ...BASE, time: "12:00+09:00" }],
    [{ ...BASE, place: { lat: 91, lon: 0 } }], [{ ...BASE, place: { lat: NaN, lon: 0 } }], [{ ...BASE, place: { lat: 0, lon: Infinity } }],
    [{ ...BASE, place: { lat: true as unknown as number, lon: 0 } }], [{ ...BASE, place: { lat: 90, lon: 0 } }],
    [{ ...BASE, timeAccuracy: "unknown" as const }], [{ date: "2000-01-01", timeAccuracy: "exact" as const }],
    [{ date: "2000-01-01", time: "12:00" }],
  ])("拒否 %#", (input) => {
    expect(() => norm(input, BASE_UTC)).toThrow(InputError);
  });
  it("エラー文に入力値を含めない", () => {
    try { norm({ ...BASE, date: "1234-56-78" }); expect.unreachable(); }
    catch (e) { expect(String(e)).not.toContain("1234"); }
  });
  it("当日までは受け付ける", () => {
    expect(norm({ date: "2026-11-05" }).isoDate).toBe("2026-11-05");
  });
});

describe("時刻の確かさ", () => {
  it("不明なら正午で埋めず、数秘のみ計算する", async () => {
    const ctx = norm({ date: "2000-01-01", timeAccuracy: "unknown" });
    expect(ctx.jdUt).toBeNull();
    const r = await calculate(ctx, engine);
    for (const id of ["gene_keys", "western", "esoteric", "vedic"]) {
      expect(r[id]!.status).toBe("unavailable");
      expect(r[id]!.missing).toEqual(["time"]);
      expect(r[id]!.items).toEqual([]);
    }
    expect(r.numerology!.status).toBe("calculated");
  });
  it("おおよそは仮計算になり、数秘は確定のまま", async () => {
    const ctx = norm({ ...BASE, timeAccuracy: "approximate" }, BASE_UTC);
    const r = await calculate(ctx, engine);
    expect(r.gene_keys!.status).toBe("provisional");
    expect(r.numerology!.status).toBe("calculated");
    expect(ctx.notes.join()).toContain("仮計算");
  });
});

describe("遺伝子易経", () => {
  it("64鍵・6ラインの全境界", () => {
    KEY_ORDER.forEach((key, g) => {
      for (let line = 1; line <= 6; line++) {
        const b = 302 + g * 5.625 + (line - 1) * 0.9375;
        expect(keyLine(b)).toMatchObject({ key, line });
        expect(keyLine(b + 1e-7)).toMatchObject({ key, line });
      }
    });
    expect([...KEY_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
  });
  it("黄経の循環", () => {
    expect(keyLine(-58).value).toBe("41.1");
    expect(keyLine(662).value).toBe("41.1");
  });
  it("88度であり88日ではない", () => {
    const jd = engine.utcToJdUt(BASE_UTC);
    const d = engine.findSolarArcBefore(jd, 88);
    const sep = (((engine.position(jd, 0).longitude - engine.position(d, 0).longitude) % 360) + 360) % 360;
    expect(Math.abs(sep - 88)).toBeLessThan(1e-6);
    expect(Math.abs(jd - d - 88)).toBeGreaterThan(0.01);
  });
  it("鍵とラインを別の解説キーで引く", async () => {
    const r = await calculate(norm(BASE, BASE_UTC), engine, ["gene_keys"]);
    const item = r.gene_keys!.items.find((i) => i.id === "lifes_work")!;
    expect(item.value).toEqual({ key: 38, line: 1 });
    expect(item.contentKeys).toEqual(["gk.sphere.lifes_work", "gk.key.38", "gk.line.1", "gk.sphere.lifes_work.line.1"]);
    expect(r.gene_keys!.items).toHaveLength(12);
    // コアと天職は同じ配置を別の道で読む
    const by = (id: string) => r.gene_keys!.items.find((i) => i.id === id)!;
    expect(by("core").display).toBe(by("vocation").display);
    expect([by("core").group, by("vocation").group]).toEqual(["venus", "pearl"]);
    expect(r.gene_keys!.settings.official).toBe(false);
  });
});

describe("西洋・インド", () => {
  it("出生地なしならハウスとラグナを保留する", async () => {
    const r = await calculate(norm({ ...BASE, place: undefined }, BASE_UTC), engine);
    expect((r.western!.data as any).houses.status).toBe("unavailable");
    expect((r.vedic!.data as any).lagna).toBeNull();
    expect(r.gene_keys!.status).toBe("calculated");
  });
  it("高緯度ではハウスのみ保留し、方式を変えない", async () => {
    const r = await calculate(norm({ ...BASE, place: { lat: 70, lon: 20 } }, BASE_UTC), engine, ["western"]);
    const d = r.western!.data as any;
    expect(d.houses.status).toBe("unsupported");
    expect(d.ascendant).not.toBeNull();
    expect(r.western!.settings.houses).toBe("placidus");
    expect(Object.values<any>(d.planets).every((p) => p.house === undefined)).toBe(true);
  });
  it("実行順で設定が混ざらない", async () => {
    const ctx = norm(BASE, BASE_UTC);
    const a = await calculate(ctx, engine, ["vedic", "western"]);
    const b = await calculate(ctx, engine, ["western", "vedic"]);
    expect(a.western!.data).toEqual(b.western!.data);
    expect(a.vedic!.data).toEqual(b.vedic!.data);
  });
  it("ナクシャトラの境界", () => {
    expect(nakshatra(0)).toEqual({ index: 1, name: "アシュヴィニー", pada: 1 });
    expect(nakshatra(359.999)).toMatchObject({ index: 27, pada: 4 });
  });
});

describe("数秘", () => {
  it.each([11, 22, 33])("%i を保持", (n) => expect(reduceNumber(n).value).toBe(n));
  it("計算過程", () => expect(reduceNumber(1999).trace).toEqual([1999, 28, 10, 1]));
  it("現地の暦日を使う(UTCでは前日でも変わらない)", async () => {
    const r = await calculate(norm({ ...BASE, time: "00:10" }, [1999, 12, 31, 15, 10, 0]), engine, ["numerology"]);
    expect((r.numerology!.data as NumerologyData).lifePath).toBe(4);
  });
});

describe("登録と暦", () => {
  it("5体系が登録され、未登録は拒否する", async () => {
    expect(Object.keys(MODULE_LOADERS).sort()).toEqual(["esoteric", "gene_keys", "numerology", "vedic", "western"]);
    await expect(calculate(norm(BASE, BASE_UTC), engine, ["made_up"])).rejects.toThrow(InputError);
  });
  it("由来を結果に残す", async () => {
    const r = await calculate(norm(BASE, BASE_UTC), engine, ["western"]);
    expect(r.western!.provenance).toMatchObject({ engineVersion: "2.10.03", ephemeris: "swiss" });
  });
  it("暦ファイルがなければ起動しない", async () => {
    const wasm = fs.readFileSync(new URL("../vendor/swe/swe.wasm", import.meta.url));
    await expect(SwissEngine.create({ wasm, ephemeris: { "sepl_18.se1": new Uint8Array(0), "semo_18.se1": new Uint8Array(0) } })).rejects.toThrow(EphemerisError);
  });
  it("Swiss暦の範囲外では別の暦へ切り替えず停止する", () => {
    // 同梱の暦は1800〜2399年。範囲外(1500年頃)は Moshier へ黙って切り替わらないこと
    expect(() => engine.position(2268932.5, 0)).toThrow(EphemerisError);
  });
});
