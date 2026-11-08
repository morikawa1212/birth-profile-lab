// SPDX-License-Identifier: AGPL-3.0-or-later
import { PLANET_LABELS } from "../core/bodies";
import { SIGN_IDS, SIGNS } from "../core/zodiac";

const SIGN_LABEL = Object.fromEntries(SIGN_IDS.map((id, i) => [id, SIGNS[i]!]));
const GRAHA: Readonly<Record<string, string>> = { ...PLANET_LABELS, rahu: "ラーフ", ketu: "ケートゥ" };
const ASPECT: Readonly<Record<string, string>> = { conjunction: "合", sextile: "六分", square: "矩", trine: "三分", opposition: "衝" };
const ESO_BODY: Readonly<Record<string, string>> = { ...PLANET_LABELS, earth: "地球", vulcan: "ヴァルカン" };
const SPHERE: Readonly<Record<string, string>> = { lifes_work: "ライフワーク", evolution: "進化", radiance: "輝き", purpose: "目的", attraction: "引き寄せ", iq: "知能指数（IQ）", eq: "心の知能指数（EQ）", sq: "魂の知能指数（SQ）", core: "コア", vocation: "天職", culture: "文化", pearl: "パール" };

/** 解説キーの見出し。解説データに title があればそちらを優先する */
export function contentHeading(key: string): string {
  const p = key.split(".");
  switch (p[0]) {
    case "gk":
      if (p[1] === "sphere") return p[3] === "line" ? `${SPHERE[p[2]!]}での第${p[4]}ライン` : `${SPHERE[p[2]!]}とは`;
      return p[1] === "key" ? `第${p[2]}の鍵` : `第${p[2]}ライン(一般)`;
    case "west":
      if (p[1] === "planet") return PLANET_LABELS[p[2]!]!;
      if (p[1] === "sign") return SIGN_LABEL[p[2]!]!;
      if (p[1] === "house") return `第${p[2]}ハウス`;
      if (p[1] === "angle") return p[2] === "asc" ? "ASC(アセンダント)" : "MC(天頂)";
      return `アスペクト: ${ASPECT[p[2]!]}`;
    case "vedic":
      if (p[1] === "graha") return GRAHA[p[2]!]!;
      if (p[1] === "rashi") return SIGN_LABEL[p[2]!]!;
      if (p[1] === "bhava") return `第${p[2]}室`;
      if (p[1] === "lagna") return "ラグナ";
      if (p[1] === "nakshatra") return "ナクシャトラ";
      return `第${p[2]}パーダ`;
    case "eso":
      if (p[1] === "point") return { asc: "ASC: 魂の方向性", sun: "太陽: パーソナリティ", moon: "月: 過去の条件づけ" }[p[2]!] ?? key;
      if (p[1] === "sign") return `${SIGN_LABEL[p[2]!]}(秘教占星術)`;
      if (p[1] === "cross") return { mutable: "柔軟十字", fixed: "不動十字", cardinal: "活動十字" }[p[2]!] ?? key;
      if (p[1] === "ray") return `第${p[2]}光線`;
      if (p[1] === "planet") return `${ESO_BODY[p[2]!] ?? p[2]}(秘教占星術)`;
      if (p[1] === "ruler") return { orthodox: "通常の支配星", esoteric: "秘教的支配星", hierarchical: "ハイアラーキの支配星" }[p[2]!] ?? key;
      if (p[1] === "article") return `秘教占星術を学ぶ ${p[2]}`;
      return key;
    case "num":
      return p[1] === "life_path" ? `ライフパス ${p[2]}` : `誕生数 ${p[2]}`;
    default:
      return key;
  }
}

export const GROUP_LABELS: Readonly<Record<string, string>> = {
  activation: "変容活性化の道", venus: "ヴィーナスの道", pearl: "パールの道",
  planets: "天体", angles: "ASC・MC", aspects: "アスペクト",
  lagna: "ラグナ", nakshatra: "ナクシャトラ", core: "主要な数",
  triad: "魂・パーソナリティ・過去", rulers: "支配星", rays: "関係する光線", bodies: "天体と光線",
};

const SETTING_VALUES: Readonly<Record<string, string>> = {
  tropical: "トロピカル", sidereal: "サイデリアル", geocentric_apparent: "地心視位置",
  solar_longitude_minus_88_degrees: "太陽黄経が88度前の時点", "11_spheres": "11スフィア",
  placidus: "プラシーダス", ecliptic_longitude_between_cusps: "黄経とカスプの比較", uniform_orb: "全アスペクト共通",
  Lahiri: "ラヒリ", whole_sign: "ホールサイン", mean: "平均ノード", D1_and_moon_nakshatra: "D1と月のナクシャトラ",
  western_shared: "西洋占星術の計算を共有", bailey_tabulation_vi: "ベイリー『秘教占星学』表VI(通常・秘教・ハイアラーキ)",
  bailey_planets_and_constellations: "惑星の光線と、星座を通じて働く光線を区別", sun_plus_180: "太陽黄経 + 180°(象徴的位置)",
  not_calculated: "位置算出対象外",
  all_digits_preserve_11_22_33: "生年月日の全桁を足し、11・22・33が出たら止める", day_digits_preserve_11_22: "生まれた日を1桁になるまで足し、11・22は止める", gregorian_local_date: "出生地の現地の暦日",
};
const SETTING_NAMES: Readonly<Record<string, string>> = {
  zodiac: "黄道帯", positions: "天体位置", designRule: "出生前の時点", scope: "範囲", houses: "ハウス方式",
  houseAssignment: "天体のハウス判定", aspectOrbDeg: "オーブ(度)", aspectRule: "オーブの決め方", ayanamsa: "アヤナムサ",
  base: "天体の計算", rulers: "支配星", rays: "光線", earth: "地球", vulcan: "ヴァルカン", node: "ノード", method: "ライフパス", birthdayMethod: "誕生数", calendar: "暦",
};
const HIDDEN = new Set(["official", "nameNumerology"]);

export function settingRows(settings: Readonly<Record<string, unknown>>): [string, string][] {
  return Object.entries(settings)
    .filter(([k]) => !HIDDEN.has(k))
    .map(([k, v]) => [SETTING_NAMES[k] ?? k, SETTING_VALUES[String(v)] ?? String(v)]);
}

export const SUMMARY_ITEMS: Readonly<Record<string, readonly string[]>> = {
  gene_keys: ["lifes_work", "evolution", "radiance", "purpose"],
  western: ["sun", "moon", "asc", "mc"],
  esoteric: ["asc", "sun", "moon", "asc_ruler_esoteric"],
  vedic: ["lagna", "moon", "moon_nakshatra"],
  numerology: ["life_path", "birthday"],
};
export const MODULE_ORDER = ["gene_keys", "western", "esoteric", "vedic", "numerology"] as const;
export const MODULE_LABELS: Readonly<Record<string, string>> = { gene_keys: "遺伝子易経", western: "西洋占星術", esoteric: "秘教占星術", vedic: "インド占星術", numerology: "数秘術" };
export const MISSING_LABELS: Readonly<Record<string, string>> = { time: "出生時刻", place: "出生地", date: "生年月日" };
