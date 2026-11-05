// SPDX-License-Identifier: AGPL-3.0-or-later
/** 入力の誤り。message は利用者にそのまま表示できる文にし、入力値を含めない */
export class InputError extends Error {
  override name = "InputError";
}
/** 暦ファイルの不足など、計算を続けられない状態 */
export class EphemerisError extends Error {
  override name = "EphemerisError";
}
