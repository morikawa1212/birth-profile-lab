// SPDX-License-Identifier: AGPL-3.0-or-later
// 共通の入力・結果の型。解説本文は結果に含めず contentKeys で引く。

export type TimeAccuracy = "exact" | "approximate" | "unknown";

export interface BirthInput {
  /** 出生地の現地暦日 YYYY-MM-DD。数秘はこの値を使う */
  date: string;
  timeAccuracy?: TimeAccuracy;
  /** 現地時刻 HH:MM または HH:MM:SS */
  time?: string;
  place?: { label?: string; lat: number; lon: number };
  /** IANA タイムゾーン名 */
  timezone?: string;
}

export type UtcParts = readonly [number, number, number, number, number, number];

export interface NormalizedBirth {
  isoDate: string;
  year: number;
  month: number;
  day: number;
  timeAccuracy: TimeAccuracy;
  timezone: string | null;
  utc: UtcParts | null;
  jdUt: number | null;
  lat: number | null;
  lon: number | null;
  tzdataVersion: string | null;
  notes: readonly string[];
}

export type InputField = "date" | "time" | "place";
export type ModuleStatus = "calculated" | "provisional" | "unavailable";

export interface ResultItem {
  id: string;
  group?: string;
  label: string;
  value: Readonly<Record<string, number | string | boolean>>;
  display: string;
  contentKeys: readonly string[];
}

export interface Provenance {
  engine: "Swiss Ephemeris";
  engineVersion: string;
  ephemeris: "swiss";
  ephemerisFiles: readonly string[];
  tzdata: string | null;
}

export interface ModuleResult<D = unknown> {
  moduleId: string;
  moduleVersion: string;
  status: ModuleStatus;
  /** status が unavailable のとき、不足している入力 */
  missing?: readonly InputField[];
  settings: Readonly<Record<string, unknown>>;
  provenance: Provenance;
  items: readonly ResultItem[];
  /** 体系固有の詳細。画面の表やテストの照合に使う */
  data: D | null;
}

export type ValidationStatus = "experimental" | "cross_checked";

export interface DivinationModule<S = Readonly<Record<string, unknown>>, D = unknown> {
  id: string;
  version: string;
  label: string;
  /** すべて揃わないと計算しない入力 */
  requires: readonly InputField[];
  defaultSettings: S;
  validationStatus: ValidationStatus;
  compute(ctx: NormalizedBirth, svc: Services, settings: S): ComputedParts<D>;
}

export interface ComputedParts<D> {
  items: readonly ResultItem[];
  data: D;
}

export interface Services {
  ephemeris: EphemerisService;
}

export interface BodyPosition {
  longitude: number;
  longitudeSpeed: number;
  retrograde: boolean;
}

export interface HouseResult {
  /** 12ハウスのカスプ。第1ハウスが先頭 */
  cusps: readonly number[];
  ascendant: number;
  mc: number;
}

export interface EphemerisService {
  position(jdUt: number, body: number, sidereal?: boolean): BodyPosition;
  /** 計算できない条件では null。別方式へ切り替えない */
  houses(jdUt: number, lat: number, lon: number, system: "P" | "W", sidereal?: boolean): HouseResult | null;
  ayanamsa(jdUt: number): number;
  /** 太陽黄経が degrees 度だけ前になる時点を探す */
  findSolarArcBefore(jdUt: number, degrees: number): number;
}
