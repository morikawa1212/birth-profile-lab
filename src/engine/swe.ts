// SPDX-License-Identifier: AGPL-3.0-or-later
// WASM 版 Swiss Ephemeris の接続層。Swiss暦ファイルのみを使い、他の暦へ切り替えない。
import createSwe, { type SweModule } from "../../vendor/swe/swe.mjs";
import { EphemerisError } from "../core/errors";
import { BODY } from "../core/bodies";
import { norm360 } from "../core/zodiac";
import type { BodyPosition, EphemerisService, HouseResult, UtcParts } from "../core/types";

const FLG_SWIEPH = 2;
const FLG_SPEED = 256;
const FLG_SIDEREAL = 64 * 1024;
const SIDM_LAHIRI = 1;
const SE_GREG_CAL = 1;
const EPHE_DIR = "/ephe";

export const EPHEMERIS_FILES = ["sepl_18.se1", "semo_18.se1"] as const;

export interface EngineAssets {
  wasm: ArrayBuffer | Uint8Array;
  /** 暦ファイル名とその中身 */
  ephemeris: Readonly<Record<(typeof EPHEMERIS_FILES)[number], Uint8Array>>;
}

export class SwissEngine implements EphemerisService {
  readonly version: string;
  private readonly M: SweModule;
  private readonly xx: number;
  private readonly serr: number;
  private readonly cusps: number;
  private readonly ascmc: number;
  private readonly dret: number;
  private readonly aya: number;

  private constructor(M: SweModule) {
    this.M = M;
    this.xx = M._malloc(6 * 8);
    this.serr = M._malloc(256);
    this.cusps = M._malloc(13 * 8);
    this.ascmc = M._malloc(10 * 8);
    this.dret = M._malloc(2 * 8);
    this.aya = M._malloc(8);
    const buf = M._malloc(256);
    M._swe_version(buf);
    this.version = M.UTF8ToString(buf);
    M._free(buf);
    M.ccall("swe_set_ephe_path", null, ["string"], [EPHE_DIR]);
  }

  static async create(assets: EngineAssets): Promise<SwissEngine> {
    const M = await createSwe({ wasmBinary: assets.wasm });
    M.FS.mkdir(EPHE_DIR);
    for (const name of EPHEMERIS_FILES) {
      const bytes = assets.ephemeris[name];
      if (!bytes?.length) throw new EphemerisError(`暦ファイルがありません: ${name}`);
      M.FS.writeFile(`${EPHE_DIR}/${name}`, bytes);
    }
    return new SwissEngine(M);
  }

  private double(ptr: number, index: number): number {
    return this.M.getValue(ptr + 8 * index, "double");
  }

  utcToJdUt(utc: UtcParts): number {
    const [y, m, d, h, mi, s] = utc;
    const r = this.M._swe_utc_to_jd(y, m, d, h, mi, s, SE_GREG_CAL, this.dret, this.serr);
    if (r < 0) throw new EphemerisError(this.M.UTF8ToString(this.serr));
    return this.double(this.dret, 1);
  }

  position(jdUt: number, body: number, sidereal = false): BodyPosition {
    let flags = FLG_SWIEPH | FLG_SPEED;
    if (sidereal) {
      // 設定はプロセス全体で共有されるため、恒星黄道の計算では毎回指定する
      this.M._swe_set_sid_mode(SIDM_LAHIRI, 0, 0);
      flags |= FLG_SIDEREAL;
    }
    const ret = this.M._swe_calc_ut(jdUt, body, flags, this.xx, this.serr);
    if (ret < 0) throw new EphemerisError(this.M.UTF8ToString(this.serr));
    if (body !== BODY.meanNode && !(ret & FLG_SWIEPH)) {
      throw new EphemerisError("Swiss暦ファイルで計算できなかったため停止しました。");
    }
    const speed = this.double(this.xx, 3);
    return { longitude: norm360(this.double(this.xx, 0)), longitudeSpeed: speed, retrograde: speed < 0 };
  }

  houses(jdUt: number, lat: number, lon: number, system: "P" | "W", sidereal = false): HouseResult | null {
    if (sidereal) this.M._swe_set_sid_mode(SIDM_LAHIRI, 0, 0);
    const r = this.M._swe_houses_ex(jdUt, sidereal ? FLG_SIDEREAL : 0, lat, lon, system.charCodeAt(0), this.cusps, this.ascmc);
    // 計算できない場合 Swiss Ephemeris は別方式の値を返すので、値を使わない
    if (r < 0) return null;
    return {
      cusps: Array.from({ length: 12 }, (_, i) => this.double(this.cusps, i + 1)),
      ascendant: this.double(this.ascmc, 0),
      mc: this.double(this.ascmc, 1),
    };
  }

  ayanamsa(jdUt: number): number {
    this.M._swe_set_sid_mode(SIDM_LAHIRI, 0, 0);
    const r = this.M._swe_get_ayanamsa_ex_ut(jdUt, FLG_SWIEPH, this.aya, this.serr);
    if (r < 0) throw new EphemerisError(this.M.UTF8ToString(this.serr));
    return this.double(this.aya, 0);
  }

  findSolarArcBefore(jdUt: number, degrees: number): number {
    const sun = this.position(jdUt, BODY.sun).longitude;
    const residual = (jd: number): number => norm360(sun - this.position(jd, BODY.sun).longitude + 180) - 180 - degrees;
    // 太陽の速度は毎日約0.95〜1.02度なので、度数の0.8〜1.15倍の日数に必ず解がある
    let low = jdUt - degrees * 1.15;
    let high = jdUt - degrees * 0.8;
    if (residual(low) <= 0 || residual(high) >= 0) throw new EphemerisError("太陽黄経の探索範囲が不正です。");
    for (let i = 0; i < 52; i++) {
      const mid = (low + high) / 2;
      if (residual(mid) > 0) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  }
}
