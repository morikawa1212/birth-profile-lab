// SPDX-License-Identifier: AGPL-3.0-or-later
// 入力の検証。現地時刻から UTC への変換は第2段階の時刻層が担当し、ここへ UTC を渡す。
import { InputError } from "./errors";
import type { BirthInput, NormalizedBirth, TimeAccuracy, UtcParts } from "./types";

const MIN_YEAR = 1900;

export interface NormalizeOptions {
  /** 入力の上限日 YYYY-MM-DD(通常は当日) */
  today: string;
  /** 出生時刻がある場合に必須。時刻層の変換結果 */
  utc?: UtcParts;
  tzdataVersion?: string;
  toJdUt: (utc: UtcParts) => number;
}

export function parseIsoDate(value: unknown): { year: number; month: number; day: number } {
  const m = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!m) throw new InputError("生年月日は実在する日付で入力してください。");
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new InputError("生年月日は実在する日付で入力してください。");
  }
  return { year, month, day };
}

export function validateTime(value: unknown): void {
  const m = typeof value === "string" ? /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value) : null;
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59 || Number(m[3] ?? 0) > 59) {
    throw new InputError("出生時刻は 00:00 から 23:59 の形式で入力してください。");
  }
}

function validCoordinate(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

export function normalizeBirth(input: BirthInput, opts: NormalizeOptions): NormalizedBirth {
  const { year, month, day } = parseIsoDate(input?.date);
  if (year < MIN_YEAR) throw new InputError(`対応範囲は${MIN_YEAR}年以降です。`);
  if (input.date > opts.today) throw new InputError("生年月日に未来の日付は入力できません。");

  const accuracy: TimeAccuracy = input.timeAccuracy ?? (input.time ? "exact" : "unknown");
  if (!["exact", "approximate", "unknown"].includes(accuracy)) throw new InputError("出生時刻の確かさを選んでください。");
  if (accuracy === "unknown" && input.time) {
    throw new InputError("時刻が不明の場合は、時刻を入力しないでください。おおよその時刻なら「おおよそ」を選んでください。");
  }
  if (accuracy !== "unknown" && !input.time) throw new InputError("出生時刻を入力してください。");
  if (input.time) validateTime(input.time);

  let lat: number | null = null;
  let lon: number | null = null;
  if (input.place) {
    if (!validCoordinate(input.place.lat, 90) || !validCoordinate(input.place.lon, 180)) {
      throw new InputError("出生地の緯度・経度を確認してください。");
    }
    if (Math.abs(input.place.lat) === 90) throw new InputError("地理上の極点は扱えません。");
    lat = input.place.lat;
    lon = input.place.lon;
  }

  const notes: string[] = [];
  let utc: UtcParts | null = null;
  let jdUt: number | null = null;
  if (input.time) {
    if (!input.timezone) throw new InputError("出生時刻の計算には、出生地またはタイムゾーンが必要です。");
    if (!opts.utc) throw new InputError("現地時刻を世界時へ変換できませんでした。");
    utc = opts.utc;
    jdUt = opts.toJdUt(utc);
  }
  if (accuracy === "approximate") notes.push("おおよその時刻による仮計算です。");
  if (accuracy === "unknown") notes.push("出生時刻が不明のため、時刻を使う計算は保留しています。");

  return {
    isoDate: input.date, year, month, day, timeAccuracy: accuracy,
    timezone: input.timezone ?? null, utc, jdUt, lat, lon,
    tzdataVersion: opts.tzdataVersion ?? null, notes,
  };
}
