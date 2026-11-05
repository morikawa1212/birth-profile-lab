// SPDX-License-Identifier: AGPL-3.0-or-later
import fs from "node:fs";
import { normalizeBirth } from "../src/core/birth";
import type { BirthInput, NormalizedBirth, UtcParts } from "../src/core/types";
import { SwissEngine } from "../src/engine/swe";

const root = new URL("../", import.meta.url).pathname;
export const engine = await SwissEngine.create({
  wasm: fs.readFileSync(root + "vendor/swe/swe.wasm"),
  ephemeris: { "sepl_18.se1": fs.readFileSync(root + "public/ephe/sepl_18.se1"), "semo_18.se1": fs.readFileSync(root + "public/ephe/semo_18.se1") },
});
export const TODAY = "2026-11-05";
export const norm = (input: BirthInput, utc?: UtcParts): NormalizedBirth =>
  normalizeBirth(input, { today: TODAY, utc, toJdUt: (u) => engine.utcToJdUt(u) });
export const BASE: BirthInput = { date: "2000-01-01", time: "12:00", timezone: "Asia/Tokyo", place: { lat: 35.6812, lon: 139.7671 } };
export const BASE_UTC: UtcParts = [2000, 1, 1, 3, 0, 0];
