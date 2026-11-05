// SPDX-License-Identifier: AGPL-3.0-or-later
// 公式チャートなどと手作業で比べるための合成の出生情報と、このアプリの結果を書き出す。実在の人の情報ではない。
import fs from "node:fs";
import { calculate } from "../src/engine/calculate";
import { SwissEngine } from "../src/engine/swe";
import { resolveBirth } from "../src/time/resolve";
import type { GeneKeysData } from "../src/modules/gene_keys/index";
import type { TzData } from "../src/time/tz";

const root = new URL("../", import.meta.url).pathname;
const engine = await SwissEngine.create({ wasm: fs.readFileSync(root + "vendor/swe/swe.wasm"), ephemeris: { "sepl_18.se1": fs.readFileSync(root + "public/ephe/sepl_18.se1"), "semo_18.se1": fs.readFileSync(root + "public/ephe/semo_18.se1") } });
const tz: TzData = JSON.parse(fs.readFileSync(root + "public/data/tzdata.json", "utf8"));
const CASES = [
  ["通常(東京)", "1985-04-15", "09:30", "Asia/Tokyo", 35.68, 139.77, "東京"],
  ["日本の夏時間(UTC+10)", "1950-07-01", "10:00", "Asia/Tokyo", 34.69, 135.5, "大阪"],
  ["閏日", "2000-02-29", "18:45", "Asia/Tokyo", 43.06, 141.35, "札幌"],
  ["年末(UTCで前年)", "1999-01-01", "00:20", "Asia/Tokyo", 26.21, 127.68, "那覇"],
  ["米国の夏時間", "1975-08-20", "14:10", "America/New_York", 40.71, -74.01, "New York"],
  ["英国", "1962-03-03", "06:05", "Europe/London", 51.51, -0.13, "London"],
  ["南半球の夏時間", "1990-12-25", "21:15", "Australia/Sydney", -33.87, 151.21, "Sydney"],
  ["インド(30分単位の時差)", "1972-11-11", "05:40", "Asia/Kolkata", 28.61, 77.21, "New Delhi"],
  ["日付変更線付近", "2011-12-29", "23:30", "Pacific/Apia", -13.83, -171.76, "Apia"],
  ["高緯度(ハウス保留)", "1980-06-21", "12:00", "Europe/Oslo", 69.65, 18.96, "Tromsø"],
] as const;
let md = "# 公式チャートとの手作業の照合\n\n合成の出生情報です。実在の人の情報ではありません。公式サイトや別の計算ソフトに入力し、値を比べます。\n\n";
md += "| 例 | 生年月日 | 時刻 | 場所 | ライフワーク | 進化 | 輝き | 目的 | 引き寄せ | IQ | EQ | SQ | コア/天職 | 文化 | パール | ASC | ラグナ |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n";
for (const [name, date, time, timezone, lat, lon, place] of CASES) {
  const b = resolveBirth({ date, time, timezone, place: { lat, lon } }, tz, { today: "2026-11-05", toJdUt: (u) => engine.utcToJdUt(u) });
  const r = await calculate(b, engine);
  const s = (r.gene_keys!.data as GeneKeysData).spheres;
  const w = r.western!.items.find((i) => i.id === "asc")!.display, v = r.vedic!.items.find((i) => i.id === "lagna")!.display;
  md += `| ${name} | ${date} | ${time} | ${place} | ${["lifes_work", "evolution", "radiance", "purpose", "attraction", "iq", "eq", "sq", "vocation", "culture", "pearl"].map((k) => s[k]!.value).join(" | ")} | ${w} | ${v} |\n`;
}
fs.writeFileSync(root + "docs/validation/manual-cases.md", md);
