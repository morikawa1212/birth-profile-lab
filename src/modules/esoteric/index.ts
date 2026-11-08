// SPDX-License-Identifier: AGPL-3.0-or-later
// 秘教占星術: 西洋占星術の計算結果(トロピカル、プラシーダス、ASC/MC)をそのまま使い、
// ベイリーの支配星・光線・十字を重ねる。天体の位置は計算し直さない。
// 魂やパーソナリティの光線、イニシエーションの段階は判定しない。チャートを通じて関係する光線だけを示す。
import type { DivinationModule, ResultItem } from "../../core/types";
import { formatDegree, norm360, zodiac, type ZodiacPosition } from "../../core/zodiac";
import { ASPECTS, houseOf, PLANETS, westernModule, type WesternData } from "../western/index";
import {
  BODY_LABELS, CROSS_LABELS, crossOf, PLANET_RAYS, RAY_NAMES, RULER_LABELS, RULERS, signRays,
  type CrossId, type EsotericBody, type RayNumber, type RulerScheme, type SignId,
} from "./data";

export const SCHEMES: readonly RulerScheme[] = ["esoteric", "orthodox", "hierarchical"];
export const TRIAD = ["asc", "sun", "moon"] as const;
export type TriadId = (typeof TRIAD)[number];

export const TRIAD_LABELS: Readonly<Record<TriadId, string>> = { asc: "ASC(魂の方向性)", sun: "太陽(パーソナリティ)", moon: "月(過去の条件づけ)" };

export interface EsotericAspect { other: string; aspect: string; orb: number }

export type BodyPlacement =
  | { status: "calculated"; position: ZodiacPosition; house?: number; retrograde: boolean }
  /** 地球。太陽の反対側から導いた象徴的な位置 */
  | { status: "derived"; position: ZodiacPosition; house?: number }
  /** ヴァルカン。確定した軌道がないため位置を出さない */
  | { status: "not_calculated" };

export interface EsotericBodyInfo {
  body: EsotericBody;
  ray: RayNumber;
  sacred: boolean;
  placement: BodyPlacement;
  aspects: readonly EsotericAspect[];
  /** この天体が支配する星座。体系ごと */
  rules: Readonly<Record<RulerScheme, readonly SignId[]>>;
}

export interface RulerLink {
  scheme: RulerScheme;
  body: EsotericBody;
  /** ASC との角度。位置のない天体は null */
  toAsc: { separation: number; aspect?: string } | null;
}

export interface TriadPoint {
  id: TriadId;
  position: ZodiacPosition;
  house?: number;
  cross: CrossId;
  signRays: readonly RayNumber[];
  rulers: Readonly<Record<RulerScheme, EsotericBody>>;
}

export interface EsotericData {
  points: Readonly<Partial<Record<TriadId, TriadPoint>>>;
  /** ASC がない理由。出生地がないときなど */
  ascMissing?: "place";
  bodies: Readonly<Record<EsotericBody, EsotericBodyInfo>>;
  /** ASC の3つの支配星と ASC の関係 */
  ascRulers: readonly RulerLink[];
  houses: WesternData["houses"];
  mc: ZodiacPosition | null;
}

const settings = {
  base: "western_shared", zodiac: "tropical", houses: "placidus", rulers: "bailey_tabulation_vi",
  rays: "bailey_planets_and_constellations", earth: "sun_plus_180", vulcan: "not_calculated", aspectOrbDeg: 6,
} as const;

const BODIES: readonly EsotericBody[] = [...PLANETS, "earth", "vulcan"];

function aspectBetween(a: number, b: number, orbLimit: number): { aspect: string; orb: number; separation: number } | null {
  const separation = Math.abs(norm360(a - b + 180) - 180);
  for (const [aspect, target] of ASPECTS) {
    const orb = Math.abs(separation - target);
    if (orb <= orbLimit) return { aspect, orb, separation };
  }
  return null;
}

function rulesOf(body: EsotericBody): Record<RulerScheme, SignId[]> {
  const out: Record<RulerScheme, SignId[]> = { orthodox: [], esoteric: [], hierarchical: [] };
  for (const [sign, r] of Object.entries(RULERS) as [SignId, Record<RulerScheme, EsotericBody>][]) {
    for (const s of SCHEMES) if (r[s] === body) out[s].push(sign);
  }
  return out;
}

const rayText = (rays: readonly RayNumber[]): string => rays.map((r) => `第${r}光線`).join("・");

function placementText(p: BodyPlacement): string {
  if (p.status === "not_calculated") return "位置算出対象外";
  return `${p.position.sign} ${formatDegree(p.position.degreeInSign)}${p.status === "calculated" && p.retrograde ? " 逆行" : ""}${p.house ? ` 第${p.house}ハウス` : ""}${p.status === "derived" ? "(象徴的位置)" : ""}`;
}

export const esotericModule: DivinationModule<typeof settings, EsotericData> = {
  id: "esoteric", version: "0.1.0", label: "秘教占星術",
  requires: ["date", "time"], defaultSettings: settings, validationStatus: "experimental",
  compute(ctx, svc, s) {
    // 西洋占星術と同じ計算をそのまま使う
    const w = westernModule.compute(ctx, svc, westernModule.defaultSettings).data;
    const cusps = w.houses.status === "calculated" ? w.houses.cusps : null;

    const sun = w.planets.sun!;
    const earthPos = zodiac(sun.longitude + 180);
    const placements: Record<EsotericBody, BodyPlacement> = {} as Record<EsotericBody, BodyPlacement>;
    for (const name of PLANETS) {
      const p = w.planets[name]!;
      placements[name] = { status: "calculated", position: zodiac(p.longitude), retrograde: p.retrograde, ...(p.house ? { house: p.house } : {}) };
    }
    const earthHouse = cusps ? houseOf(earthPos.longitude, cusps) : undefined;
    placements.earth = { status: "derived", position: earthPos, ...(earthHouse ? { house: earthHouse } : {}) };
    placements.vulcan = { status: "not_calculated" };

    const longitudeOf = (b: EsotericBody): number | null => {
      const p = placements[b];
      return p.status === "not_calculated" ? null : p.position.longitude;
    };

    const bodies = {} as Record<EsotericBody, EsotericBodyInfo>;
    for (const body of BODIES) {
      const aspects: EsotericAspect[] = [];
      if (body === "earth") {
        // 地球は太陽の正反対なので、太陽との衝は数えない
        for (const other of PLANETS) {
          if (other === "sun") continue;
          const x = aspectBetween(earthPos.longitude, w.planets[other]!.longitude, s.aspectOrbDeg);
          if (x) aspects.push({ other, aspect: x.aspect, orb: x.orb });
        }
      } else if (body !== "vulcan") {
        for (const x of w.aspects) {
          if (x.a === body) aspects.push({ other: x.b, aspect: x.aspect, orb: x.orb });
          else if (x.b === body) aspects.push({ other: x.a, aspect: x.aspect, orb: x.orb });
        }
      }
      const r = PLANET_RAYS[body];
      bodies[body] = { body, ray: r.ray, sacred: r.sacred, placement: placements[body], aspects, rules: rulesOf(body) };
    }

    const point = (id: TriadId, pos: ZodiacPosition, house?: number): TriadPoint => {
      const sign = pos.signId as SignId;
      return { id, position: pos, ...(house ? { house } : {}), cross: crossOf(sign), signRays: signRays(sign), rulers: RULERS[sign] };
    };
    const points: Partial<Record<TriadId, TriadPoint>> = {};
    if (w.ascendant) points.asc = point("asc", w.ascendant, 1);
    points.sun = point("sun", zodiac(sun.longitude), sun.house);
    points.moon = point("moon", zodiac(w.planets.moon!.longitude), w.planets.moon!.house);

    const ascRulers: RulerLink[] = points.asc
      ? SCHEMES.map((scheme) => {
          const body = points.asc!.rulers[scheme];
          const lon = longitudeOf(body);
          if (lon === null) return { scheme, body, toAsc: null };
          const separation = Math.abs(norm360(lon - points.asc!.position.longitude + 180) - 180);
          const x = aspectBetween(lon, points.asc!.position.longitude, s.aspectOrbDeg);
          return { scheme, body, toAsc: { separation, ...(x ? { aspect: x.aspect } : {}) } };
        })
      : [];

    const data: EsotericData = { points, ...(points.asc ? {} : { ascMissing: "place" as const }), bodies, ascRulers, houses: w.houses, mc: w.mc };
    return { items: buildItems(data), data };
  },
};

function buildItems(d: EsotericData): ResultItem[] {
  const items: ResultItem[] = [];
  for (const id of TRIAD) {
    const p = d.points[id];
    if (!p) continue;
    items.push({
      id, group: "triad", label: TRIAD_LABELS[id],
      value: { sign: p.position.sign, degree: p.position.degreeInSign, cross: p.cross, rays: p.signRays.join(","), ...(p.house && id !== "asc" ? { house: p.house } : {}) },
      display: `${p.position.sign} ${formatDegree(p.position.degreeInSign)}${p.house && id !== "asc" ? ` 第${p.house}ハウス` : ""} ・${CROSS_LABELS[p.cross]} ・${rayText(p.signRays)}`,
      contentKeys: [`eso.point.${id}`, `eso.sign.${p.position.signId}`, `eso.cross.${p.cross}`],
    });
  }

  const asc = d.points.asc;
  if (asc) {
    for (const link of d.ascRulers) {
      const b = d.bodies[link.body];
      const rel = link.toAsc ? (link.toAsc.aspect ? ` ・ASCと${ASPECT_LABEL[link.toAsc.aspect]}` : "") : "";
      items.push({
        id: `asc_ruler_${link.scheme}`, group: "rulers", label: `ASCの${RULER_LABELS[link.scheme]}`,
        value: { body: link.body, ray: b.ray, sacred: b.sacred, ...(link.toAsc ? { separationToAsc: link.toAsc.separation } : {}) },
        display: `${BODY_LABELS[link.body]}(第${b.ray}光線) ${placementText(b.placement)}${rel}`,
        contentKeys: [`eso.planet.${link.body}`, `eso.ruler.${link.scheme}`],
      });
    }
  }
  const sun = d.points.sun!;
  const sunRuler = d.bodies[sun.rulers.orthodox];
  items.push({
    id: "sun_ruler_orthodox", group: "rulers", label: "太陽星座の通常の支配星",
    value: { body: sunRuler.body, ray: sunRuler.ray },
    display: `${BODY_LABELS[sunRuler.body]}(第${sunRuler.ray}光線) ${placementText(sunRuler.placement)}`,
    contentKeys: [`eso.planet.${sunRuler.body}`, "eso.ruler.orthodox"],
  });

  // 星座を通じて働く光線と、支配星を通して働く光線を分けて示す
  const rays: [string, string, readonly RayNumber[]][] = [];
  if (asc) {
    rays.push(["asc_sign_rays", "ASCの星座を通じて働く光線", asc.signRays]);
    rays.push(["asc_ruler_ray", "ASCの秘教的支配星の光線", [d.bodies[asc.rulers.esoteric].ray]]);
  }
  rays.push(["sun_sign_rays", "太陽星座を通じて働く光線", sun.signRays]);
  rays.push(["sun_ruler_ray", "太陽の通常の支配星の光線", [sunRuler.ray]]);
  rays.push(["moon_sign_rays", "月星座を通じて働く光線", d.points.moon!.signRays]);
  for (const [id, label, list] of rays) {
    items.push({
      id, group: "rays", label, value: { rays: list.join(",") },
      display: list.map((r) => `第${r}光線(${RAY_NAMES[r]})`).join("、"),
      contentKeys: list.map((r) => `eso.ray.${r}`),
    });
  }

  for (const body of BODIES) {
    const b = d.bodies[body];
    items.push({
      id: `body_${body}`, group: "bodies", label: BODY_LABELS[body],
      value: { ray: b.ray, sacred: b.sacred, status: b.placement.status, ...(b.placement.status !== "not_calculated" ? { sign: b.placement.position.sign, degree: b.placement.position.degreeInSign } : {}) },
      display: `${placementText(b.placement)} ・第${b.ray}光線 ・${b.sacred ? "聖なる惑星" : "聖ならざる惑星"}`,
      contentKeys: [`eso.planet.${body}`],
    });
  }
  return items;
}

export const ASPECT_LABEL: Readonly<Record<string, string>> = Object.fromEntries(ASPECTS.map(([id, , label]) => [id, label]));
