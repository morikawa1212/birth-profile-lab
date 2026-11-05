// SPDX-License-Identifier: AGPL-3.0-or-later
export interface SweModule {
  _malloc(size: number): number;
  _free(ptr: number): void;
  _swe_version(buf: number): number;
  _swe_set_sid_mode(mode: number, t0: number, ayanT0: number): void;
  _swe_calc_ut(jd: number, planet: number, flags: number, xx: number, serr: number): number;
  _swe_houses_ex(jd: number, flags: number, lat: number, lon: number, hsys: number, cusps: number, ascmc: number): number;
  _swe_get_ayanamsa_ex_ut(jd: number, flags: number, aya: number, serr: number): number;
  _swe_utc_to_jd(y: number, m: number, d: number, h: number, mi: number, s: number, greg: number, dret: number, serr: number): number;
  _swe_close(): void;
  ccall(name: string, ret: null, argTypes: string[], args: unknown[]): void;
  getValue(ptr: number, type: string): number;
  UTF8ToString(ptr: number): string;
  FS: { mkdir(path: string): void; writeFile(path: string, data: Uint8Array): void };
}
export default function createSwe(opts?: { wasmBinary?: ArrayBuffer | Uint8Array }): Promise<SweModule>;
