// SPDX-License-Identifier: AGPL-3.0-or-later
// Swiss Ephemeris の天体番号
export const BODY = { sun: 0, moon: 1, mercury: 2, venus: 3, mars: 4, jupiter: 5, saturn: 6, uranus: 7, neptune: 8, pluto: 9, meanNode: 10 } as const;
export const PLANET_LABELS: Readonly<Record<string, string>> = {
  sun: "太陽", moon: "月", mercury: "水星", venus: "金星", mars: "火星",
  jupiter: "木星", saturn: "土星", uranus: "天王星", neptune: "海王星", pluto: "冥王星",
};
