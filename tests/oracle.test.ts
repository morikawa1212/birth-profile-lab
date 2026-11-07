// SPDX-License-Identifier: AGPL-3.0-or-later
// Python 試作(oracle/)を基準に、全モジュールの出力が一致することを確かめる。
import fs from "node:fs";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import type { UtcParts } from "../src/core/types";
import { calculate } from "../src/engine/calculate";
import type { GeneKeysData } from "../src/modules/gene_keys/index";
import type { NumerologyData } from "../src/modules/numerology/index";
import type { VedicData } from "../src/modules/vedic/index";
import type { WesternData } from "../src/modules/western/index";
import { engine, norm } from "./helpers";

const fx = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL("./fixtures/oracle.json.gz", import.meta.url))).toString());
const TOL = 2e-8;
const angle = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe("Python 基準との一致", () => {
  it(`合成 ${fx.cases.length} 件`, async () => {
    expect(fx.cases.length).toBeGreaterThanOrEqual(1000);
    let high = 0;
    for (const c of fx.cases) {
      const i = c.input;
      const m = /^(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/.exec(c.utc)!;
      const utc = m.slice(1, 7).map(Number) as unknown as UtcParts;
      const ctx = norm({ date: i.date, time: i.time, timeAccuracy: i.time_accuracy, timezone: i.timezone, place: i.latitude === undefined ? undefined : { lat: i.latitude, lon: i.longitude } }, utc);
      const r = await calculate(ctx, engine);
      const py = c.modules;
      for (const id of ["gene_keys", "western", "vedic"]) expect(r[id]!.status).toBe(py[id].status);

      const gk = r.gene_keys!.data as GeneKeysData;
      expect(Math.abs(gk.daysBeforeBirth - py.gene_keys.data.days_before_birth)).toBeLessThan(TOL);
      for (const [k, v] of Object.entries<any>(py.gene_keys.data.spheres)) {
        expect(gk.spheres[k]!.value).toBe(v.value);
        expect(angle(gk.spheres[k]!.longitude, v.longitude)).toBeLessThan(TOL);
      }

      const w = r.western!.data as WesternData;
      for (const [k, v] of Object.entries<any>(py.western.data.planets)) {
        const t = w.planets[k]!;
        expect(angle(t.longitude, v.longitude)).toBeLessThan(TOL);
        expect(t.sign).toBe(v.sign);
        expect(t.retrograde).toBe(v.retrograde);
        expect(t.house).toBe(v.house);
      }
      expect(w.houses.status).toBe(py.western.data.houses.status);
      if (w.houses.status === "calculated") {
        w.houses.cusps.forEach((x, j) => expect(angle(x, py.western.data.houses.cusps[j])).toBeLessThan(TOL));
        expect(angle(w.ascendant!.longitude, py.western.data.houses.ascendant.longitude)).toBeLessThan(TOL);
        expect(angle(w.mc!.longitude, py.western.data.houses.mc.longitude)).toBeLessThan(TOL);
      } else if (w.houses.status === "unsupported") {
        high++;
        expect(w.ascendant).not.toBeNull(); // 試作からの変更: ASC/MC は高緯度でも出す
      }
      expect(w.aspects.map((a) => `${a.a}-${a.b}-${a.aspect}`)).toEqual(py.western.data.aspects.map((a: any) => `${a.a}-${a.b}-${a.aspect}`));

      const v = r.vedic!.data as VedicData;
      for (const [k, p] of Object.entries<any>(py.vedic.data.planets)) {
        expect(angle(v.planets[k]!.longitude, p.longitude)).toBeLessThan(TOL);
        expect(v.planets[k]!.sign).toBe(p.sign);
        expect(v.planets[k]!.house).toBe(p.house);
      }
      if (py.vedic.data.lagna.status === "calculated") expect(angle(v.lagna!.longitude, py.vedic.data.lagna.longitude)).toBeLessThan(TOL);
      else expect(v.lagna).toBeNull();
      expect(v.moonNakshatra).toEqual({ index: py.vedic.data.moon_nakshatra.index, name: py.vedic.data.moon_nakshatra.name, pada: py.vedic.data.moon_nakshatra.pada });
      expect(Math.abs(v.ayanamsa - py.vedic.data.ayanamsa_deg)).toBeLessThan(TOL);

      const n = r.numerology!.data as NumerologyData;
      const pn = py.numerology.data;
      expect(n.lifePath).toBe(pn.life_path);
      expect(n.sumTrace).toEqual(pn.sum_trace);
      expect(n.birthday).toBe(pn.birthday);
      expect(n.birthdayTrace).toEqual(pn.birthday_trace);
      expect(n.digits).toEqual(pn.digits);
    }
    expect(high).toBeGreaterThan(0); // 高緯度の例が含まれていること
  }, 120_000);
});
