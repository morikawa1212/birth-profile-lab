// SPDX-License-Identifier: AGPL-3.0-or-later
// 入力の揃い方に応じて各体系を実行する。不足があればその体系だけ保留する。
import type { InputField, ModuleResult, NormalizedBirth, Provenance } from "../core/types";
import { InputError } from "../core/errors";
import { MODULE_LOADERS } from "../modules/registry";
import { EPHEMERIS_FILES, type SwissEngine } from "./swe";

const has = (ctx: NormalizedBirth, f: InputField): boolean =>
  f === "date" ? true : f === "time" ? ctx.jdUt !== null : ctx.lat !== null;

export async function calculate(ctx: NormalizedBirth, engine: SwissEngine, ids?: readonly string[]): Promise<Readonly<Record<string, ModuleResult>>> {
  const selected = ids ?? Object.keys(MODULE_LOADERS);
  const unknown = selected.filter((id) => !MODULE_LOADERS[id]);
  if (unknown.length) throw new InputError(`未登録のモジュールです: ${unknown.join(", ")}`);
  const provenance: Provenance = {
    engine: "Swiss Ephemeris", engineVersion: engine.version, ephemeris: "swiss",
    ephemerisFiles: EPHEMERIS_FILES, tzdata: ctx.tzdataVersion,
  };
  const out: Record<string, ModuleResult> = {};
  for (const id of selected) {
    const mod = await MODULE_LOADERS[id]!();
    const base = { moduleId: mod.id, moduleVersion: mod.version, settings: mod.defaultSettings as Readonly<Record<string, unknown>>, provenance };
    const missing = mod.requires.filter((f) => !has(ctx, f));
    if (missing.length) {
      out[id] = { ...base, status: "unavailable", missing, items: [], data: null };
      continue;
    }
    const { items, data } = mod.compute(ctx, { ephemeris: engine }, mod.defaultSettings as never);
    const usesTime = mod.requires.includes("time");
    out[id] = { ...base, status: usesTime && ctx.timeAccuracy === "approximate" ? "provisional" : "calculated", items, data };
  }
  return out;
}
