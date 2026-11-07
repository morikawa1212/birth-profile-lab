// SPDX-License-Identifier: AGPL-3.0-or-later
// 数秘術(生年月日): 年月日の全桁を足し、途中や最後に 11・22・33 が出たら止める方式。現地の暦日を使う。
import type { DivinationModule } from "../../core/types";

const MASTERS = new Set([11, 22, 33]);

export function reduceNumber(start: number): { value: number; trace: number[] } {
  const trace = [start];
  let value = start;
  while (value > 9 && !MASTERS.has(value)) {
    value = [...String(value)].reduce((sum, c) => sum + Number(c), 0);
    trace.push(value);
  }
  return { value, trace };
}

export interface NumerologyData {
  lifePath: number;
  /** 生年月日(YYYYMMDD)の各桁 */
  digits: number[];
  /** 全桁の合計から結果までの過程 */
  sumTrace: number[];
  birthday: number;
  birthdayTrace: number[];
}

const settings = { method: "all_digits_preserve_11_22_33", birthdayMethod: "day_digits_preserve_11_22", calendar: "gregorian_local_date", nameNumerology: false } as const;

export const numerologyModule: DivinationModule<typeof settings, NumerologyData> = {
  id: "numerology", version: "0.2.0", label: "数秘術",
  requires: ["date"], defaultSettings: settings, validationStatus: "experimental",
  compute(ctx) {
    const digits = [...`${String(ctx.year).padStart(4, "0")}${String(ctx.month).padStart(2, "0")}${String(ctx.day).padStart(2, "0")}`].map(Number);
    const sum = reduceNumber(digits.reduce((total, d) => total + d, 0));
    const birthday = reduceNumber(ctx.day);
    return {
      items: [
        {
          id: "life_path", group: "core", label: "ライフパス", value: { number: sum.value },
          display: String(sum.value), contentKeys: [`num.life_path.${sum.value}`],
        },
        {
          id: "birthday", group: "core", label: "誕生数", value: { number: birthday.value },
          display: String(birthday.value), contentKeys: [`num.birthday.${birthday.value}`],
        },
      ],
      data: { lifePath: sum.value, digits, sumTrace: sum.trace, birthday: birthday.value, birthdayTrace: birthday.trace },
    };
  },
};
