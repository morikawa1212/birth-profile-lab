// SPDX-License-Identifier: AGPL-3.0-or-later
// 秘教占星術のマスターデータ。アリス・A・ベイリー『秘教占星学』(Esoteric Astrology) を基準にする。
// 西洋占星術の支配星とは別に持ち、西洋占星術の設定は書き換えない。
// ページは Lucis Trust 1998年電子版 PDF のページ番号。
import type { SIGN_IDS } from "../../core/zodiac";

export type SignId = (typeof SIGN_IDS)[number];
export type RayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** 秘教占星術で扱う天体。ヴァルカンは位置を算出しない。地球は太陽の反対側の象徴的位置 */
export type EsotericBody = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto" | "earth" | "vulcan";
export type RulerScheme = "orthodox" | "esoteric" | "hierarchical";
export type CrossId = "mutable" | "fixed" | "cardinal";

export interface SourceRef {
  work: "Esoteric Astrology";
  chapter: string;
  section?: string;
  pdfPages: readonly number[];
  url?: string;
}

const LUCIS = "https://www.lucistrust.org/online_books/esoteric_astrology_obooks";

export const SOURCES = {
  rulers: {
    work: "Esoteric Astrology", chapter: "Chapter I. The Zodiac and the Rays", section: "Tabulation VI. Planetary Rulers in 3 Tabulations",
    pdfPages: [35], url: `${LUCIS}/chapter_the_zodiac_and_the_rays/3_the_great_wheel_and_spiritual_unfoldment_part1`,
  },
  rulerTabulations: {
    work: "Esoteric Astrology", chapter: "Chapter I. The Zodiac and the Rays", section: "Tabulations IV, V, VII",
    pdfPages: [33, 34, 35], url: `${LUCIS}/chapter_the_zodiac_and_the_rays/3_the_great_wheel_and_spiritual_unfoldment_part1`,
  },
  planetRays: {
    work: "Esoteric Astrology", chapter: "Chapter IV. The Sacred and Non-Sacred Planets", section: "The Centres, the Rays and the Signs",
    pdfPages: [246], url: `${LUCIS}/chapter_iv_the_sacred_and_nonsacred_planets/1_the_centres_the_rays_and_the_signs`,
  },
  signRays: {
    work: "Esoteric Astrology", chapter: "Chapter III. The Science of Triangles", section: "The rays and the constellations through which they are transmitted",
    pdfPages: [235, 236],
  },
  crosses: {
    work: "Esoteric Astrology", chapter: "Chapter II. The Nature of Esoteric Astrology / Chapter VI. The Three Crosses", section: "The Crosses and the Signs",
    pdfPages: [161, 263, 264], url: `${LUCIS}/chapter_ii_the_nature_esoteric_astrology/2_the_crosses_and_the_signs`,
  },
  triad: {
    work: "Esoteric Astrology", chapter: "Chapter I. The Zodiac and the Rays / Chapter IV. The Sacred and Non-Sacred Planets", section: "The sun sign, the rising sign and the moon",
    pdfPages: [10, 246],
  },
  veiling: {
    work: "Esoteric Astrology", chapter: "Chapter I〜IV", section: "The moon and the sun veiling a hidden planet",
    pdfPages: [8, 25, 68, 145, 155, 189, 213, 246, 256],
  },
  keynotes: {
    work: "Esoteric Astrology", chapter: "Chapter VII. The Rays, Constellations and Planets", section: "Keynotes from the angle of form and of the soul",
    pdfPages: [311, 312],
  },
} as const satisfies Record<string, SourceRef>;

/** 表VI。牡羊座から魚座の順。通常・秘教・ハイアラーキ(創造のハイアラーキー) */
export const RULERS: Readonly<Record<SignId, Readonly<Record<RulerScheme, EsotericBody>>>> = {
  aries: { orthodox: "mars", esoteric: "mercury", hierarchical: "uranus" },
  taurus: { orthodox: "venus", esoteric: "vulcan", hierarchical: "vulcan" },
  gemini: { orthodox: "mercury", esoteric: "venus", hierarchical: "earth" },
  cancer: { orthodox: "moon", esoteric: "neptune", hierarchical: "neptune" },
  leo: { orthodox: "sun", esoteric: "sun", hierarchical: "sun" },
  virgo: { orthodox: "mercury", esoteric: "moon", hierarchical: "jupiter" },
  libra: { orthodox: "venus", esoteric: "uranus", hierarchical: "saturn" },
  scorpio: { orthodox: "mars", esoteric: "mars", hierarchical: "mercury" },
  sagittarius: { orthodox: "jupiter", esoteric: "earth", hierarchical: "mars" },
  capricorn: { orthodox: "saturn", esoteric: "saturn", hierarchical: "venus" },
  aquarius: { orthodox: "uranus", esoteric: "jupiter", hierarchical: "moon" },
  pisces: { orthodox: "jupiter", esoteric: "pluto", hierarchical: "pluto" },
};

export interface PlanetRay { ray: RayNumber; sacred: boolean; note?: string }

/** 惑星と光線(第4章)。この世界周期での対応としてベイリーが挙げたもの */
export const PLANET_RAYS: Readonly<Record<EsotericBody, PlanetRay>> = {
  vulcan: { ray: 1, sacred: true },
  mercury: { ray: 4, sacred: true },
  venus: { ray: 5, sacred: true },
  jupiter: { ray: 2, sacred: true },
  saturn: { ray: 3, sacred: true },
  neptune: { ray: 6, sacred: true },
  uranus: { ray: 7, sacred: true },
  mars: { ray: 6, sacred: false },
  earth: { ray: 3, sacred: false },
  pluto: { ray: 1, sacred: false },
  moon: { ray: 4, sacred: false, note: "隠れた惑星を覆う" },
  sun: { ray: 2, sacred: false, note: "隠れた惑星を覆う" },
};

/** 光線と、それを伝える星座(第3章)。1つの星座に複数の光線が関係する */
export const RAY_SIGNS: Readonly<Record<RayNumber, readonly SignId[]>> = {
  1: ["aries", "leo", "capricorn"],
  2: ["gemini", "virgo", "pisces"],
  3: ["cancer", "libra", "capricorn"],
  4: ["taurus", "scorpio", "sagittarius"],
  5: ["leo", "sagittarius", "aquarius"],
  6: ["virgo", "sagittarius", "pisces"],
  7: ["aries", "cancer", "capricorn"],
};

export function signRays(sign: SignId): RayNumber[] {
  return (Object.keys(RAY_SIGNS).map(Number) as RayNumber[]).filter((r) => RAY_SIGNS[r].includes(sign));
}

export const CROSSES: Readonly<Record<CrossId, readonly SignId[]>> = {
  mutable: ["gemini", "virgo", "sagittarius", "pisces"],
  fixed: ["taurus", "leo", "scorpio", "aquarius"],
  cardinal: ["aries", "cancer", "libra", "capricorn"],
};

export function crossOf(sign: SignId): CrossId {
  return (Object.keys(CROSSES) as CrossId[]).find((c) => CROSSES[c].includes(sign))!;
}

export const BODY_LABELS: Readonly<Record<EsotericBody, string>> = {
  sun: "太陽", moon: "月", mercury: "水星", venus: "金星", mars: "火星", jupiter: "木星",
  saturn: "土星", uranus: "天王星", neptune: "海王星", pluto: "冥王星", earth: "地球", vulcan: "ヴァルカン",
};

export const RAY_NAMES: Readonly<Record<RayNumber, string>> = {
  1: "意志・力", 2: "愛・智慧", 3: "活動的知性", 4: "葛藤を通した調和",
  5: "具体的知識・科学", 6: "献身・理想主義", 7: "儀式的秩序",
};

export const SCHEME_LABELS: Readonly<Record<RulerScheme, string>> = { orthodox: "通常", esoteric: "秘教", hierarchical: "ハイアラーキ" };
export const RULER_LABELS: Readonly<Record<RulerScheme, string>> = { orthodox: "通常の支配星", esoteric: "秘教的支配星", hierarchical: "ハイアラーキの支配星" };
export const CROSS_LABELS: Readonly<Record<CrossId, string>> = { mutable: "柔軟十字", fixed: "不動十字", cardinal: "活動十字" };

/**
 * 覆い隠す惑星。ベイリーは文脈によって、月がヴァルカン・天王星・海王星を、
 * 太陽がヴァルカン・天王星・海王星を覆うと述べる。どれを指すかは文脈で異なるため、自動では置き換えない。
 */
export const VEILING: Readonly<Record<"sun" | "moon", readonly { veils: EsotericBody; context: string; pdfPage: number }[]>> = {
  moon: [
    { veils: "vulcan", context: "平均的な段階の人を扱うときは、月の代わりにヴァルカンで見るという提案", pdfPage: 8 },
    { veils: "uranus", context: "高度に発達した人を扱うときは、月の代わりに天王星で見るという提案", pdfPage: 8 },
    { veils: "uranus", context: "水瓶座の章。第3光線が天王星と、天王星を象徴的に覆う月を通して届く", pdfPage: 68 },
    { veils: "neptune", context: "蟹座の章。人類を水瓶座へハイアラーキの次元で関係づける月", pdfPage: 155 },
    { veils: "vulcan", context: "牡牛座の章。不動十字の他の腕との関係で", pdfPage: 189 },
    { veils: "uranus", context: "天王星の働きについて。月は天王星を指す目隠しとして使われることが多い", pdfPage: 213 },
  ],
  sun: [
    { veils: "vulcan", context: "表III(星座と創造のハイアラーキー)", pdfPage: 25 },
    { veils: "neptune", context: "獅子座の章。パーソナリティへの働き", pdfPage: 145 },
    { veils: "uranus", context: "獅子座の章。パーソナリティへの魂の働き", pdfPage: 145 },
    { veils: "uranus", context: "第5章。獅子座の支配星としての太陽", pdfPage: 256 },
  ],
};
