// SPDX-License-Identifier: AGPL-3.0-or-later
// 計算専用の Web Worker。入力をここの外へ送らず、記録もしない。
import wasmUrl from "../../vendor/swe/swe.wasm?url";
import type { ModuleResult, NormalizedBirth } from "../core/types";
import { InputError } from "../core/errors";
import { manualPlace, type PlaceCandidate } from "../places/search";
import { confirmBirth, resolveBirth, validateDraft, type BirthDraft, type Confirmation } from "../time/resolve";
import { zoneNames, type TzData } from "../time/tz";
import { calculate } from "./calculate";
import { SwissEngine } from "./swe";

export interface CalcResult {
  birth: NormalizedBirth;
  modules: Readonly<Record<string, ModuleResult>>;
  engineVersion: string;
  tzdata: string;
}
export interface WorkerApi {
  confirm(draft: BirthDraft, today: string): Confirmation;
  calculate(draft: BirthDraft, today: string): CalcResult;
  zones(): string[];
  manualPlace(lat: number, lon: number, timezone: string): PlaceCandidate;
}

let base = "";
let tzPromise: Promise<TzData> | null = null;
let enginePromise: Promise<SwissEngine> | null = null;

async function bytes(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("load_failed");
  return new Uint8Array(await r.arrayBuffer());
}
const tz = () => (tzPromise ??= fetch(new URL("data/tzdata.json", base)).then((r) => {
  if (!r.ok) throw new Error("load_failed");
  return r.json() as Promise<TzData>;
}));
const engine = () => (enginePromise ??= (async () => {
  const [wasm, sepl, semo] = await Promise.all([
    bytes(wasmUrl.startsWith("data:") ? wasmUrl : new URL(wasmUrl, import.meta.url).href),
    bytes(new URL("ephe/sepl_18.se1", base).href),
    bytes(new URL("ephe/semo_18.se1", base).href),
  ]);
  return SwissEngine.create({ wasm, ephemeris: { "sepl_18.se1": sepl, "semo_18.se1": semo } });
})());

const handlers = {
  async confirm(draft: BirthDraft, today: string) {
    validateDraft(draft, today);
    // 暦ファイルは約1.9MBあるので、入力を終えてから取得を始める。失敗は計算時に報告する
    void engine().catch(() => undefined);
    return confirmBirth(draft, await tz());
  },
  async calculate(draft: BirthDraft, today: string): Promise<CalcResult> {
    const [t, e] = await Promise.all([tz(), engine()]);
    const birth = resolveBirth(draft, t, { today, toJdUt: (u) => e.utcToJdUt(u) });
    return { birth, modules: await calculate(birth, e), engineVersion: e.version, tzdata: t.version };
  },
  async zones() {
    return zoneNames(await tz());
  },
  async manualPlace(lat: number, lon: number, timezone: string) {
    return manualPlace(lat, lon, timezone, await tz());
  },
};

self.onmessage = async (e: MessageEvent<{ id: number; base?: string; method?: keyof typeof handlers; args?: unknown[] }>) => {
  const { id, method, args } = e.data;
  if (e.data.base) {
    base = e.data.base;
    return;
  }
  try {
    const value = await (handlers[method!] as (...a: unknown[]) => Promise<unknown>)(...(args ?? []));
    self.postMessage({ id, value });
  } catch (err) {
    // 入力エラーの文は入力値を含まない。それ以外は内容を画面へ出さない
    self.postMessage({ id, error: err instanceof InputError ? { input: true, message: err.message } : { input: false } });
  }
};
