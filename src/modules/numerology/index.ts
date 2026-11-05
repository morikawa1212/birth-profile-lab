// SPDX-License-Identifier: AGPL-3.0-or-later
// 数秘術(生年月日): 年月日を個別に還元し、11・22・33 を保持する方式。現地の暦日を使う。
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
  components: Readonly<Record<"year" | "month" | "day", { value: number; trace: number[] }>>;
  sumTrace: number[];
  birthday: number;
  birthdayTrace: number[];
}

const settings = { method: "three_components_preserve_11_22_33", calendar: "gregorian_local_date", nameNumerology: false } as const;

export const numerologyModule: DivinationModule<typeof settings, NumerologyData> = {
  id: "numerology", version: "0.1.0", label: "数秘術",
  requires: ["date"], defaultSettings: settings, validationStatus: "experimental",
  compute(ctx) {
    const components = { year: reduceNumber(ctx.year), month: reduceNumber(ctx.month), day: reduceNumber(ctx.day) };
    const sum = reduceNumber(components.year.value + components.month.value + components.day.value);
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
      data: { lifePath: sum.value, components, sumTrace: sum.trace, birthday: birthday.value, birthdayTrace: birthday.trace },
    };
  },
};
