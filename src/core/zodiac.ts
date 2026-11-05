// SPDX-License-Identifier: AGPL-3.0-or-later
export const SIGNS = ["牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座", "天秤座", "蠍座", "射手座", "山羊座", "水瓶座", "魚座"] as const;
export const SIGN_IDS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;

export const norm360 = (x: number): number => ((x % 360) + 360) % 360;

export interface ZodiacPosition {
  longitude: number;
  signIndex: number;
  sign: string;
  signId: string;
  degreeInSign: number;
}

export function zodiac(longitude: number): ZodiacPosition {
  const value = norm360(longitude);
  const signIndex = Math.floor(value / 30);
  return { longitude: value, signIndex, sign: SIGNS[signIndex]!, signId: SIGN_IDS[signIndex]!, degreeInSign: value % 30 };
}

export const formatDegree = (x: number): string => `${x.toFixed(2)}°`;
