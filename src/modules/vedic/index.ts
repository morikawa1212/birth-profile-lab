// SPDX-License-Identifier: AGPL-3.0-or-later
// インド占星術: サイデリアル(ラヒリ)、ホールサイン、平均ノード、D1、月のナクシャトラ。
import { BODY, PLANET_LABELS } from "../../core/bodies";
import type { DivinationModule, ResultItem } from "../../core/types";
import { formatDegree, norm360, zodiac, type ZodiacPosition } from "../../core/zodiac";

export const NAKSHATRAS = ["アシュヴィニー", "バラニー", "クリッティカー", "ローヒニー", "ムリガシラー", "アールドラー", "プナルヴァス", "プシャ", "アーシュレーシャー", "マガー", "プールヴァ・パールグニー", "ウッタラ・パールグニー", "ハスタ", "チトラー", "スヴァーティー", "ヴィシャーカー", "アヌラーダー", "ジェーシュター", "ムーラ", "プールヴァ・アーシャーダー", "ウッタラ・アーシャーダー", "シュラヴァナ", "ダニシュター", "シャタビシャー", "プールヴァ・バードラパダー", "ウッタラ・バードラパダー", "レーヴァティー"] as const;
const LABELS: Readonly<Record<string, string>> = { ...PLANET_LABELS, rahu: "ラーフ", ketu: "ケートゥ" };

export function nakshatra(longitude: number): { index: number; name: string; pada: number } {
  const scaled = norm360(longitude) / (360 / 27);
  const index = Math.floor(scaled);
  return { index: index + 1, name: NAKSHATRAS[index]!, pada: Math.min(4, Math.floor((scaled - index) * 4) + 1) };
}

export interface VedicPlanet extends ZodiacPosition { retrograde: boolean; house?: number }
export interface VedicData {
  planets: Readonly<Record<string, VedicPlanet>>;
  lagna: ZodiacPosition | null;
  moonNakshatra: { index: number; name: string; pada: number };
  ayanamsa: number;
}

const settings = { zodiac: "sidereal", ayanamsa: "Lahiri", houses: "whole_sign", node: "mean", scope: "D1_and_moon_nakshatra" } as const;

export const vedicModule: DivinationModule<typeof settings, VedicData> = {
  id: "vedic", version: "0.1.0", label: "インド占星術",
  requires: ["date", "time"], defaultSettings: settings, validationStatus: "experimental",
  compute(ctx, svc) {
    const jd = ctx.jdUt!;
    const eph = svc.ephemeris;
    const planets: Record<string, VedicPlanet> = {};
    for (const name of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"] as const) {
      const p = eph.position(jd, BODY[name], true);
      planets[name] = { ...zodiac(p.longitude), retrograde: p.retrograde };
    }
    const node = eph.position(jd, BODY.meanNode, true);
    planets.rahu = { ...zodiac(node.longitude), retrograde: node.retrograde };
    planets.ketu = { ...zodiac(node.longitude + 180), retrograde: node.retrograde };

    let lagna: ZodiacPosition | null = null;
    if (ctx.lat !== null && ctx.lon !== null) {
      const h = eph.houses(jd, ctx.lat, ctx.lon, "W", true);
      if (h) {
        lagna = zodiac(h.ascendant);
        for (const p of Object.values(planets)) p.house = ((p.signIndex - lagna.signIndex + 12) % 12) + 1;
      }
    }
    const moonNakshatra = nakshatra(planets.moon!.longitude);

    const items: ResultItem[] = Object.entries(planets).map(([name, p]) => ({
      id: name, group: "planets", label: LABELS[name]!,
      value: { sign: p.sign, degree: p.degreeInSign, retrograde: p.retrograde, ...(p.house ? { house: p.house } : {}) },
      display: `${p.sign} ${formatDegree(p.degreeInSign)}${p.house ? ` 第${p.house}室` : ""}`,
      contentKeys: [`vedic.graha.${name}`, `vedic.rashi.${p.signId}`, ...(p.house ? [`vedic.bhava.${p.house}`] : [])],
    }));
    if (lagna) items.unshift({
      id: "lagna", group: "lagna", label: "ラグナ", value: { sign: lagna.sign, degree: lagna.degreeInSign },
      display: `${lagna.sign} ${formatDegree(lagna.degreeInSign)}`, contentKeys: ["vedic.lagna", `vedic.rashi.${lagna.signId}`],
    });
    items.push({
      id: "moon_nakshatra", group: "nakshatra", label: "月のナクシャトラ",
      value: { index: moonNakshatra.index, name: moonNakshatra.name, pada: moonNakshatra.pada },
      display: `${moonNakshatra.name} 第${moonNakshatra.pada}パーダ`,
      contentKeys: [`vedic.nakshatra.${moonNakshatra.index}`, `vedic.pada.${moonNakshatra.pada}`],
    });
    return { items, data: { planets, lagna, moonNakshatra, ayanamsa: eph.ayanamsa(jd) } };
  },
};
