// SPDX-License-Identifier: AGPL-3.0-or-later
import fs from "node:fs";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { InputError } from "../src/core/errors";
import type { UtcParts } from "../src/core/types";
import { calculate } from "../src/engine/calculate";
import { confirmBirth, resolveBirth } from "../src/time/resolve";
import { formatOffset, parseOffset, resolveLocal, wallToEpoch, zoneNames, type TzData } from "../src/time/tz";
import { engine, TODAY } from "./helpers";

const tz: TzData = JSON.parse(fs.readFileSync(new URL("../public/data/tzdata.json", import.meta.url), "utf8"));
const gz = (f: string) => JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(`./fixtures/${f}`, import.meta.url))).toString());
const wall = (s: string) => {
  const m = s.split(/[-T:]/).map(Number) as [number, number, number, number, number, number];
  return wallToEpoch(...m);
};
const opts = { today: TODAY, toJdUt: (u: UtcParts) => engine.utcToJdUt(u) };

describe("Python zoneinfo との一致", () => {
  const fx = gz("tz-oracle.json.gz");
  it("データの版が同じ", () => expect(fx.version).toBe(tz.version));
  it(`全ゾーン ${fx.cases.length} 件の判定と UTC`, () => {
    expect(new Set(fx.cases.map((c: unknown[]) => c[0])).size).toBe(Object.keys(tz.zones).length);
    const kinds = new Set<string>();
    for (const [name, w, kind, epochs] of fx.cases as [string, string, string, number[]][]) {
      const r = resolveLocal(tz, name, wall(w));
      kinds.add(kind);
      const got = r.kind === "ok" ? [r.candidate.epoch] : r.kind === "ambiguous" ? r.candidates.map((c) => c.epoch) : [];
      if (r.kind !== kind || got.join() !== epochs.join()) throw new Error(`${name} ${w}: ${r.kind} ${got} / ${kind} ${epochs}`);
    }
    expect([...kinds].sort()).toEqual(["ambiguous", "nonexistent", "ok"]);
  });
  it("占術の照合1,000件を入力から通しても同じ UTC と結果になる", async () => {
    const o = gz("oracle.json.gz");
    for (const c of o.cases) {
      const i = c.input;
      const ctx = resolveBirth({ date: i.date, time: i.time, timeAccuracy: i.time_accuracy, timezone: i.timezone }, tz, opts);
      const u = ctx.utc!;
      const iso = `${String(u[0]).padStart(4, "0")}-${String(u[1]).padStart(2, "0")}-${String(u[2]).padStart(2, "0")}T${String(u[3]).padStart(2, "0")}:${String(u[4]).padStart(2, "0")}:${String(u[5]).padStart(2, "0")}`;
      expect(c.utc.startsWith(iso), `${i.timezone} ${i.date} ${i.time}`).toBe(true);
      const r = await calculate(ctx, engine, ["gene_keys"]);
      expect(r.gene_keys!.items[0]!.display).toBe(c.modules.gene_keys.data.spheres.lifes_work.value);
    }
  }, 60_000);
});

describe("日本の夏時間(1948〜51年)", () => {
  const d = (date: string, time: string, extra = {}) => confirmBirth({ date, time, timezone: "Asia/Tokyo", ...extra }, tz);
  it("夏時間中は UTC+10", () => {
    expect(d("1950-07-01", "10:00")).toMatchObject({ status: "ok", time: { offset: "+10:00", isDst: true, utcText: "1950-07-01 00:00:00 UTC" }, review: false });
    expect(d("1951-07-01", "10:00")).toMatchObject({ time: { offset: "+10:00" } });
  });
  it("1952年は UTC+9 に戻る", () => expect(d("1952-07-01", "10:00")).toMatchObject({ time: { offset: "+09:00", isDst: false } }));
  it("開始時の存在しない時刻", () => expect(d("1950-05-07", "00:30").status).toBe("nonexistent"));
  it("終了時の重複は本人が選ぶ", () => {
    const c = d("1950-09-10", "00:30");
    expect(c.status).toBe("ambiguous");
    if (c.status === "ambiguous") expect(c.choices.map((x) => x.offset)).toEqual(["+10:00", "+09:00"]);
    expect(d("1950-09-10", "00:30", { fold: 1 })).toMatchObject({ status: "ok", time: { offset: "+09:00" } });
  });
  it("未解決のままでは計算へ進めない", () => {
    expect(() => resolveBirth({ date: "1950-09-10", time: "00:30", timezone: "Asia/Tokyo" }, tz, opts)).toThrow(InputError);
    expect(() => resolveBirth({ date: "1950-05-07", time: "00:30", timezone: "Asia/Tokyo" }, tz, opts)).toThrow(InputError);
    expect(resolveBirth({ date: "1950-09-10", time: "00:30", timezone: "Asia/Tokyo", fold: 0 }, tz, opts).utc).toEqual([1950, 9, 9, 14, 30, 0]);
  });
});

describe("UTC差の確認と修正", () => {
  it("海外の1970年以前は要確認", () => {
    expect(confirmBirth({ date: "1935-07-01", time: "12:00", timezone: "Europe/Amsterdam" }, tz)).toMatchObject({ status: "ok", review: true, time: { offset: "+01:00" } });
    expect(confirmBirth({ date: "1970-01-01", time: "12:00", timezone: "Europe/Amsterdam" }, tz)).toMatchObject({ review: false });
    expect(confirmBirth({ date: "1935-07-01", time: "12:00", timezone: "Asia/Tokyo" }, tz)).toMatchObject({ review: false });
  });
  it("本人の修正を優先し、計算条件に記録する", () => {
    const draft = { date: "1935-07-01", time: "12:00", timezone: "Europe/Amsterdam", utcOffsetOverride: "+01:19:32" };
    expect(confirmBirth(draft, tz)).toMatchObject({ overridden: true, time: { utcText: "1935-07-01 10:40:28 UTC" } });
    const n = resolveBirth(draft, tz, opts);
    expect(n.utc).toEqual([1935, 7, 1, 10, 40, 28]);
    expect(n.notes.join()).toContain("UTC差");
  });
  it.each(["9", "+9:00", "+09:60", "+17:00", "abc"])("不正な形式 %s", (x) => expect(() => parseOffset(x)).toThrow(InputError));
  it("形式の往復", () => {
    for (const x of ["+09:00", "-04:30", "+05:53:28"]) expect(formatOffset(parseOffset(x))).toBe(x);
  });
});

describe("その他", () => {
  it("時刻不明は確認事項なし、計算は時刻なし", () => {
    const draft = { date: "2000-01-01", timeAccuracy: "unknown" as const };
    expect(confirmBirth(draft, tz).status).toBe("no_time");
    expect(resolveBirth(draft, tz, opts).jdUt).toBeNull();
  });
  it("時差が日付をまたいでも現地の暦日を保つ", () => {
    const n = resolveBirth({ date: "2000-01-01", time: "00:10", timezone: "Asia/Tokyo" }, tz, opts);
    expect(n.isoDate).toBe("2000-01-01");
    expect(n.utc).toEqual([1999, 12, 31, 15, 10, 0]);
  });
  it("未知のゾーンを拒否し、継承プロパティを拾わない", () => {
    expect(() => confirmBirth({ date: "2000-01-01", time: "12:00", timezone: "Mars/Base" }, tz)).toThrow(InputError);
    expect(() => confirmBirth({ date: "2000-01-01", time: "12:00", timezone: "constructor" }, tz)).toThrow(InputError);
  });
  it("データの版を結果に残す", () => {
    expect(resolveBirth({ date: "2000-01-01" }, tz, opts).tzdataVersion).toBe(tz.version);
    expect(zoneNames(tz)).toContain("Asia/Tokyo");
  });
});
