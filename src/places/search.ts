// SPDX-License-Identifier: AGPL-3.0-or-later
// 出生地の端末内検索。入力文字を外部へ送らない。
import { InputError } from "../core/errors";
import type { TzData } from "../time/tz";

export interface PlaceCandidate {
  label: string;
  /** 候補の補足(旧地名・地区名・国名など) */
  note?: string;
  lat: number;
  lon: number;
  timezone: string;
}

/** [表示名, かな, 緯度, 経度, 種別 0=現行の市区町村 1=旧地名 2=地区名] */
export interface JapanPlaces {
  timezone: string;
  places: readonly (readonly [string, string, number, number, number])[];
}
/** [名称, 英字名|0, 和名|0, 緯度, 経度, 国, ゾーン番号, 人口] */
export interface WorldPlaces {
  countries: Readonly<Record<string, string>>;
  zones: readonly string[];
  places: readonly (readonly [string, string | 0, string | 0, number, number, string, number, number])[];
}

export function normalizeQuery(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[ゖゕ]/g, "け")
    .replace(/[\s・･.,'’-]/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .normalize("NFC");
}
// 「市ヶ谷」「市ケ谷」「市が谷」を同じものとして探す
const looseKe = (s: string): string => s.replace(/[けが]/g, "け").replace(/[之]/g, "の");

interface Entry {
  full: string;
  keys: readonly string[];
  tier: number;
  weight: number;
  make: () => PlaceCandidate;
}
export interface PlaceIndex { entries: readonly Entry[] }

export function buildJapanIndex(data: JapanPlaces): PlaceIndex {
  const NOTE = ["", "旧地名", "地区名"];
  return {
    entries: data.places.map(([label, kana, lat, lon, tier]) => {
      const full = looseKe(normalizeQuery(label));
      const short = full.replace(/^.+?[都道府県]/, "");
      return {
        full, tier, weight: 0,
        keys: kana ? [short, looseKe(normalizeQuery(kana))] : [short],
        make: () => ({ label, lat, lon, timezone: data.timezone, ...(tier ? { note: NOTE[tier]! } : {}) }),
      };
    }),
  };
}

export function buildWorldIndex(data: WorldPlaces): PlaceIndex {
  return {
    entries: data.places.map(([name, ascii, ja, lat, lon, cc, zone, pop]) => {
      const keys = [ja, name, ascii].filter((x): x is string => !!x).map((x) => looseKe(normalizeQuery(x)));
      const label = ja ? `${ja}(${name})` : name;
      return {
        full: keys[0]!, keys, tier: 0, weight: pop,
        make: () => ({ label, note: data.countries[cc] ?? cc, lat, lon, timezone: data.zones[zone]! }),
      };
    }),
  };
}

export function searchPlaces(index: PlaceIndex, query: string, limit = 20): PlaceCandidate[] {
  const q = looseKe(normalizeQuery(query));
  if (!q) return [];
  const hits: { e: Entry; score: number }[] = [];
  for (const e of index.entries) {
    let score = -1;
    if (e.full === q || e.keys.includes(q)) score = 0;
    else if (e.full.startsWith(q) || e.keys.some((k) => k.startsWith(q))) score = 1;
    else if (e.full.includes(q) || e.keys.some((k) => k.includes(q))) score = 2;
    if (score >= 0) hits.push({ e, score });
  }
  hits.sort((a, b) => a.e.tier - b.e.tier || a.score - b.score || b.e.weight - a.e.weight || a.e.full.length - b.e.full.length);
  return hits.slice(0, limit).map((h) => h.e.make());
}

/** 検索で見つからない場合の手入力 */
export function manualPlace(lat: number, lon: number, timezone: string, tz: TzData): PlaceCandidate {
  if (![lat, lon].every(Number.isFinite) || Math.abs(lat) >= 90 || Math.abs(lon) > 180) {
    throw new InputError("緯度は -90〜90、経度は -180〜180 の範囲で入力してください。");
  }
  if (!Object.hasOwn(tz.zones, timezone)) throw new InputError("タイムゾーンを候補から選んでください。");
  return { label: "手入力の地点", lat, lon, timezone };
}
