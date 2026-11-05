// SPDX-License-Identifier: AGPL-3.0-or-later
// 遺伝子易経 11スフィア。鍵とラインの算出のみを行い、本文は解説データから引く。
import { BODY } from "../../core/bodies";
import type { DivinationModule, EphemerisService, ResultItem } from "../../core/types";
import { norm360 } from "../../core/zodiac";

// 第41の鍵がトロピカル黄経302度から始まる黄道上の順序(King Wen 順ではない)
export const KEY_ORDER = [41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60] as const;
const KEY_ARC = 5.625;
const LINE_ARC = 0.9375;
const START = 302;
const DESIGN_ARC = 88;

export function keyLine(longitude: number): { key: number; line: number; value: string } {
  const offset = norm360(longitude - START);
  const index = Math.floor(offset / KEY_ARC);
  const line = Math.floor((offset - index * KEY_ARC) / LINE_ARC) + 1;
  const key = KEY_ORDER[index]!;
  return { key, line, value: `${key}.${line}` };
}

type Epoch = "natal" | "design";
const SPHERES: readonly { id: string; label: string; group: string; epoch: Epoch; body: number; offset: number }[] = [
  { id: "lifes_work", label: "ライフワーク", group: "activation", epoch: "natal", body: BODY.sun, offset: 0 },
  { id: "evolution", label: "進化", group: "activation", epoch: "natal", body: BODY.sun, offset: 180 },
  { id: "radiance", label: "輝き", group: "activation", epoch: "design", body: BODY.sun, offset: 0 },
  { id: "purpose", label: "目的", group: "activation", epoch: "design", body: BODY.sun, offset: 180 },
  { id: "attraction", label: "引き寄せ", group: "venus", epoch: "design", body: BODY.moon, offset: 0 },
  { id: "iq", label: "IQ", group: "venus", epoch: "natal", body: BODY.venus, offset: 0 },
  { id: "eq", label: "EQ", group: "venus", epoch: "natal", body: BODY.mars, offset: 0 },
  { id: "sq", label: "SQ", group: "venus", epoch: "design", body: BODY.venus, offset: 0 },
  // コアと天職は同じ配置(出生前の火星)を、それぞれの道の視点で読む。天体の位置としては1つ
  { id: "core", label: "コア", group: "venus", epoch: "design", body: BODY.mars, offset: 0 },
  { id: "vocation", label: "天職", group: "pearl", epoch: "design", body: BODY.mars, offset: 0 },
  { id: "culture", label: "文化", group: "pearl", epoch: "design", body: BODY.jupiter, offset: 0 },
  { id: "pearl", label: "パール", group: "pearl", epoch: "natal", body: BODY.jupiter, offset: 0 },
];

export interface GeneKeysData {
  designJdUt: number;
  daysBeforeBirth: number;
  spheres: Readonly<Record<string, { key: number; line: number; value: string; longitude: number; epoch: Epoch }>>;
}

function compute(jd: number, eph: EphemerisService): { items: ResultItem[]; data: GeneKeysData } {
  const design = eph.findSolarArcBefore(jd, DESIGN_ARC);
  const spheres: Record<string, GeneKeysData["spheres"][string]> = {};
  const items: ResultItem[] = SPHERES.map((s) => {
    const longitude = norm360(eph.position(s.epoch === "natal" ? jd : design, s.body).longitude + s.offset);
    const k = keyLine(longitude);
    spheres[s.id] = { ...k, longitude, epoch: s.epoch };
    return {
      id: s.id, group: s.group, label: s.label,
      value: { key: k.key, line: k.line },
      display: k.value,
      contentKeys: [`gk.sphere.${s.id}`, `gk.key.${k.key}`, `gk.line.${k.line}`, `gk.sphere.${s.id}.line.${k.line}`],
    };
  });
  return { items, data: { designJdUt: design, daysBeforeBirth: jd - design, spheres } };
}

const settings = {
  zodiac: "tropical", positions: "geocentric_apparent", designRule: "solar_longitude_minus_88_degrees",
  scope: "11_spheres", official: false,
} as const;

export const geneKeysModule: DivinationModule<typeof settings, GeneKeysData> = {
  id: "gene_keys", version: "0.1.0", label: "遺伝子易経",
  requires: ["date", "time"], defaultSettings: settings, validationStatus: "experimental",
  compute: (ctx, svc) => compute(ctx.jdUt!, svc.ephemeris),
};
