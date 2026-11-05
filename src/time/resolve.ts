// SPDX-License-Identifier: AGPL-3.0-or-later
// 入力から確認画面の内容を作り、本人が確認した条件で正規化する。
import { normalizeBirth, parseIsoDate, validateTime } from "../core/birth";
import { InputError } from "../core/errors";
import type { BirthInput, NormalizedBirth, UtcParts } from "../core/types";
import { formatOffset, fromOffset, parseOffset, resolveLocal, wallToEpoch, type TzData, type UtcCandidate } from "./tz";

export interface BirthDraft extends BirthInput {
  /** 重複時刻で本人が選んだ候補。0 が切替前 */
  fold?: 0 | 1;
  /** 本人が確認して修正した UTC 差 */
  utcOffsetOverride?: string;
}

export interface ConfirmedTime {
  offset: string;
  isDst: boolean;
  utcText: string;
}
export type Confirmation =
  /** 時刻を使わないので確認事項がない */
  | { status: "no_time" }
  | { status: "ok"; time: ConfirmedTime; overridden: boolean; review: boolean; message?: string }
  | { status: "ambiguous"; choices: readonly [ConfirmedTime, ConfirmedTime]; message: string }
  | { status: "nonexistent"; message: string };

const pad = (n: number) => String(n).padStart(2, "0");
const toConfirmed = (c: UtcCandidate): ConfirmedTime => {
  const [y, m, d, h, mi, s] = c.utc;
  return { offset: formatOffset(c.offsetSeconds), isDst: c.isDst, utcText: `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(s)} UTC` };
};

const REVIEW_MESSAGE = "1970年より前の海外の時刻記録は、データに誤りを含むことがあります。当時のUTC差がわかる場合は修正してください。";

function wallOf(draft: BirthDraft): number {
  const { year, month, day } = parseIsoDate(draft.date);
  validateTime(draft.time);
  const [h, mi, s] = draft.time!.split(":").map(Number) as [number, number, number?];
  return wallToEpoch(year, month, day, h, mi, s ?? 0);
}

/** 日本は1948〜51年の夏時間を含めて記録が確かなので対象外とする */
const needsReview = (draft: BirthDraft): boolean => draft.date < "1970-01-01" && draft.timezone !== "Asia/Tokyo";

export function confirmBirth(draft: BirthDraft, tz: TzData): Confirmation {
  if (!draft.time) return { status: "no_time" };
  if (!draft.timezone) throw new InputError("出生時刻の計算には、出生地またはタイムゾーンが必要です。");
  const wall = wallOf(draft);
  if (draft.utcOffsetOverride) {
    return { status: "ok", time: toConfirmed(fromOffset(wall, parseOffset(draft.utcOffsetOverride))), overridden: true, review: false };
  }
  const r = resolveLocal(tz, draft.timezone, wall);
  if (r.kind === "nonexistent") {
    return { status: "nonexistent", message: "夏時間への切り替えなどにより、この現地時刻は存在しません。時刻を確認してください。" };
  }
  if (r.kind === "ambiguous") {
    const choices = [toConfirmed(r.candidates[0]), toConfirmed(r.candidates[1])] as const;
    if (draft.fold === undefined) {
      return { status: "ambiguous", choices, message: "時計を戻す切り替えのため、この現地時刻は2回あります。どちらかを選んでください。" };
    }
    const review = needsReview(draft);
    return { status: "ok", time: choices[draft.fold], overridden: false, review, ...(review ? { message: REVIEW_MESSAGE } : {}) };
  }
  const review = needsReview(draft);
  return { status: "ok", time: toConfirmed(r.candidate), overridden: false, review, ...(review ? { message: REVIEW_MESSAGE } : {}) };
}

/** 確認画面へ進む前の入力検証。ここでの UTC は検証専用で計算には使わない */
export function validateDraft(draft: BirthDraft, today: string): void {
  normalizeBirth(draft, { today, utc: [2000, 1, 1, 0, 0, 0], toJdUt: () => 0 });
}

export interface ResolveOptions {
  today: string;
  toJdUt: (utc: UtcParts) => number;
}

/** 確認済みの入力を計算用に正規化する。未解決の時刻は計算へ進めない */
export function resolveBirth(draft: BirthDraft, tz: TzData, opts: ResolveOptions): NormalizedBirth {
  let utc: UtcParts | undefined;
  const base = { today: opts.today, toJdUt: opts.toJdUt, tzdataVersion: tz.version };
  if (draft.time) {
    validateTime(draft.time);
    const conf = confirmBirth(draft, tz);
    if (conf.status === "nonexistent" || conf.status === "ambiguous") throw new InputError(conf.message);
    const wall = wallOf(draft);
    if (draft.utcOffsetOverride) utc = fromOffset(wall, parseOffset(draft.utcOffsetOverride)).utc;
    else {
      const r = resolveLocal(tz, draft.timezone!, wall);
      if (r.kind === "ok") utc = r.candidate.utc;
      else if (r.kind === "ambiguous") utc = r.candidates[draft.fold!].utc;
    }
  }
  const n = normalizeBirth(draft, { ...base, ...(utc ? { utc } : {}) });
  return draft.utcOffsetOverride && utc ? { ...n, notes: [...n.notes, "UTC差は入力された値を使っています。"] } : n;
}
