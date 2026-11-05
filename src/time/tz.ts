// SPDX-License-Identifier: AGPL-3.0-or-later
// 同梱のタイムゾーンデータで現地時刻を UTC へ変換する。端末の Intl には依存しない。
import { InputError } from "../core/errors";
import type { UtcParts } from "../core/types";

export interface TzZone {
  /** 1900年1月1日時点の UTC オフセット(秒)と夏時間フラグ */
  o: number;
  d: number;
  /** 遷移: [UTC秒, オフセット秒, 夏時間フラグ] */
  t: readonly (readonly [number, number, number])[];
}
export interface TzData {
  version: string;
  zones: Readonly<Record<string, TzZone>>;
}

export interface UtcCandidate {
  epoch: number;
  utc: UtcParts;
  offsetSeconds: number;
  isDst: boolean;
}
export type LocalResolution =
  | { kind: "ok"; candidate: UtcCandidate }
  /** 同じ現地時刻が2回ある。candidates は早い順で、0 が切替前 */
  | { kind: "ambiguous"; candidates: readonly [UtcCandidate, UtcCandidate] }
  | { kind: "nonexistent" };

const epochToParts = (epoch: number): UtcParts => {
  const d = new Date(epoch * 1000);
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
};

function zoneOf(tz: TzData, name: string): TzZone {
  const zone = Object.hasOwn(tz.zones, name) ? tz.zones[name] : undefined;
  if (!zone) throw new InputError("タイムゾーンが見つかりません。候補から選び直してください。");
  return zone;
}

/** その UTC 時点で有効な区間の番号(-1 は最初の遷移より前) */
function segmentAt(zone: TzZone, epoch: number): number {
  let lo = 0;
  let hi = zone.t.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (zone.t[mid]![0] <= epoch) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

const segmentInfo = (zone: TzZone, i: number): { offset: number; dst: boolean } =>
  i < 0 ? { offset: zone.o, dst: zone.d === 1 } : { offset: zone.t[i]![1], dst: zone.t[i]![2] === 1 };

export function wallToEpoch(y: number, m: number, d: number, h: number, mi: number, s: number): number {
  const date = new Date(Date.UTC(2000, 0, 1));
  date.setUTCFullYear(y, m - 1, d);
  date.setUTCHours(h, mi, s, 0);
  return date.getTime() / 1000;
}

export function resolveLocal(tz: TzData, name: string, wall: number): LocalResolution {
  const zone = zoneOf(tz, name);
  // オフセットは1日未満なので、現地時刻の前後1日に関わる区間だけを調べる
  const first = segmentAt(zone, wall - 86400);
  const last = segmentAt(zone, wall + 86400);
  const found: UtcCandidate[] = [];
  for (let i = first; i <= last; i++) {
    const { offset, dst } = segmentInfo(zone, i);
    const epoch = wall - offset;
    if (segmentAt(zone, epoch) === i) found.push({ epoch, utc: epochToParts(epoch), offsetSeconds: offset, isDst: dst });
  }
  found.sort((a, b) => a.epoch - b.epoch);
  if (found.length === 0) return { kind: "nonexistent" };
  if (found.length === 1) return { kind: "ok", candidate: found[0]! };
  return { kind: "ambiguous", candidates: [found[0]!, found[found.length - 1]!] };
}

export function fromOffset(wall: number, offsetSeconds: number): UtcCandidate {
  const epoch = wall - offsetSeconds;
  return { epoch, utc: epochToParts(epoch), offsetSeconds, isDst: false };
}

/** "+09:00" "-04:56:02" を秒へ変換する。範囲外や形式違いは入力エラー */
export function parseOffset(text: string): number {
  const m = /^([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim().replace("−", "-"));
  if (!m || Number(m[3]) > 59 || Number(m[4] ?? 0) > 59) throw new InputError("UTC差は +09:00 の形式で入力してください。");
  const seconds = Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4] ?? 0);
  if (seconds > 16 * 3600) throw new InputError("UTC差は ±16:00 の範囲で入力してください。");
  return m[1] === "-" ? -seconds : seconds;
}

export function formatOffset(seconds: number): string {
  const a = Math.abs(seconds);
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${seconds < 0 ? "-" : "+"}${pad(Math.floor(a / 3600))}:${pad(Math.floor(a / 60) % 60)}`;
  return a % 60 ? `${base}:${pad(a % 60)}` : base;
}

export const zoneNames = (tz: TzData): string[] => Object.keys(tz.zones).sort();
