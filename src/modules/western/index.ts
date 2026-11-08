// SPDX-License-Identifier: AGPL-3.0-or-later
// 西洋占星術: トロピカル、プラシーダス、10天体、ASC/MC、主要5アスペクト。
import { BODY, PLANET_LABELS } from "../../core/bodies";
import type { DivinationModule, ResultItem } from "../../core/types";
import { formatDegree, norm360, zodiac, type ZodiacPosition } from "../../core/zodiac";

export const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;
export const ASPECTS = [["conjunction", 0, "合"], ["sextile", 60, "六分"], ["square", 90, "矩"], ["trine", 120, "三分"], ["opposition", 180, "衝"]] as const;
// プラシーダスは極圏付近で成立しないため、ハウスのみ保留する
const PLACIDUS_MAX_LAT = 66;

/** 黄経がどのハウスに入るか。カスプの間にあるかで判定する */
export function houseOf(longitude: number, cusps: readonly number[]): number | undefined {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]!;
    if (norm360(longitude - start) < norm360(cusps[(i + 1) % 12]! - start)) return i + 1;
  }
  return undefined;
}

export interface WesternPlanet extends ZodiacPosition { retrograde: boolean; longitudeSpeed: number; house?: number }
export type WesternHouses =
  | { status: "calculated"; cusps: readonly number[] }
  | { status: "unavailable"; required: readonly string[] }
  | { status: "unsupported"; reason: string };
export interface WesternData {
  planets: Readonly<Record<string, WesternPlanet>>;
  houses: WesternHouses;
  ascendant: ZodiacPosition | null;
  mc: ZodiacPosition | null;
  aspects: readonly { a: string; b: string; aspect: string; separation: number; orb: number }[];
}

const settings = { zodiac: "tropical", houses: "placidus", houseAssignment: "ecliptic_longitude_between_cusps", aspectOrbDeg: 6, aspectRule: "uniform_orb" } as const;

export const westernModule: DivinationModule<typeof settings, WesternData> = {
  id: "western", version: "0.1.0", label: "西洋占星術",
  requires: ["date", "time"], defaultSettings: settings, validationStatus: "experimental",
  compute(ctx, svc, s) {
    const jd = ctx.jdUt!;
    const eph = svc.ephemeris;
    const planets: Record<string, WesternPlanet> = {};
    for (const name of PLANETS) {
      const p = eph.position(jd, BODY[name]);
      planets[name] = { ...zodiac(p.longitude), retrograde: p.retrograde, longitudeSpeed: p.longitudeSpeed };
    }

    let houses: WesternHouses = { status: "unavailable", required: ["place"] };
    let ascendant: ZodiacPosition | null = null;
    let mc: ZodiacPosition | null = null;
    if (ctx.lat !== null && ctx.lon !== null) {
      const placidus = Math.abs(ctx.lat) < PLACIDUS_MAX_LAT ? eph.houses(jd, ctx.lat, ctx.lon, "P") : null;
      if (placidus) {
        houses = { status: "calculated", cusps: placidus.cusps };
        for (const p of Object.values(planets)) {
          const house = houseOf(p.longitude, placidus.cusps);
          if (house) p.house = house;
        }
      } else {
        houses = { status: "unsupported", reason: "この緯度ではプラシーダスのハウスを算出できません。方式は自動で変更しません。" };
      }
      // ASC と MC はハウス方式に依存しない
      const angles = placidus ?? eph.houses(jd, ctx.lat, ctx.lon, "W");
      if (angles) { ascendant = zodiac(angles.ascendant); mc = zodiac(angles.mc); }
    }

    const aspects: { a: string; b: string; aspect: string; separation: number; orb: number }[] = [];
    PLANETS.forEach((a, i) => {
      for (const b of PLANETS.slice(i + 1)) {
        const separation = Math.abs(norm360(planets[a]!.longitude - planets[b]!.longitude + 180) - 180);
        for (const [aspect, target] of ASPECTS) {
          const orb = Math.abs(separation - target);
          if (orb <= s.aspectOrbDeg) aspects.push({ a, b, aspect, separation, orb });
        }
      }
    });

    const items: ResultItem[] = PLANETS.map((name) => {
      const p = planets[name]!;
      return {
        id: name, group: "planets", label: PLANET_LABELS[name]!,
        value: { sign: p.sign, degree: p.degreeInSign, retrograde: p.retrograde, ...(p.house ? { house: p.house } : {}) },
        display: `${p.sign} ${formatDegree(p.degreeInSign)}${p.retrograde ? " 逆行" : ""}${p.house ? ` 第${p.house}ハウス` : ""}`,
        contentKeys: [`west.planet.${name}`, `west.sign.${p.signId}`, ...(p.house ? [`west.house.${p.house}`] : [])],
      };
    });
    for (const [id, label, pos] of [["asc", "ASC", ascendant], ["mc", "MC", mc]] as const) {
      if (pos) items.push({
        id, group: "angles", label, value: { sign: pos.sign, degree: pos.degreeInSign },
        display: `${pos.sign} ${formatDegree(pos.degreeInSign)}`, contentKeys: [`west.angle.${id}`, `west.sign.${pos.signId}`],
      });
    }
    for (const x of aspects) items.push({
      id: `${x.a}-${x.b}-${x.aspect}`, group: "aspects",
      label: `${PLANET_LABELS[x.a]} ${ASPECTS.find((q) => q[0] === x.aspect)![2]} ${PLANET_LABELS[x.b]}`,
      value: { orb: x.orb }, display: `オーブ ${formatDegree(x.orb)}`, contentKeys: [`west.aspect.${x.aspect}`],
    });
    return { items, data: { planets, houses, ascendant, mc, aspects } };
  },
};
