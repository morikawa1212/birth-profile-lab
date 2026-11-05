// SPDX-License-Identifier: AGPL-3.0-or-later
// 本人が選んだときだけ、入力を端末に保存する。
import type { BirthDraft } from "../time/resolve";

const KEY = "birth-profile-draft";
export interface SavedDraft { draft: BirthDraft; placeLabel: string }

export function readSaved(): SavedDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedDraft) : null;
  } catch {
    return null;
  }
}
export function writeSaved(value: SavedDraft): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function clearSaved(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 保存できない環境では消すものもない
  }
}
