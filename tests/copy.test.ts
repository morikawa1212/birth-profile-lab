// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { calculate } from "../src/engine/calculate";
import { allModulesText, singleModuleText } from "../src/ui/copyText";
import type { ContentMap, ContentRecord } from "../src/ui/content";
import { BASE, BASE_UTC, engine, norm } from "./helpers";

const key38 = { key: "gk.key.38", locale: "ja", summary: "苦闘 → 粘り強さ → 名誉", body: "本文は入れない", sources: [], rights: { status: "owner_provided" }, review: "approved" } as ContentRecord;

const sections = { ...key38, sections: [{ heading: "読み解きのヒント", body: "ヒントの本文" }], attributes: [{ name: "天の才", value: "粘り強さ", source: "辞典" }] } as ContentRecord;
const full: ContentMap = new Map([[sections.key, sections]]);

describe("コピーの文章", () => {
  it("全体: 出生情報、全体系の結果、要約、解説本文を含む", async () => {
    const birth = norm(BASE, BASE_UTC);
    const t = allModulesText(await calculate(birth, engine), { birth, time: "12:00", placeLabel: "東京都千代田区" }, full);
    for (const x of ["【出生情報】", "生年月日: 2000-01-01", "出生時刻: 12:00", "出生地: 東京都千代田区", "タイムゾーン: Asia/Tokyo", "■ 遺伝子易経", "■ 西洋占星術", "■ インド占星術", "■ 数秘術", "[変容活性化の道]", "ライフワーク: 38.1(苦闘 → 粘り強さ → 名誉)", "知能指数（IQ）: 34.2", "コア: 26.6", "天職: 26.6", "太陽: 山羊座 9.99°", "スヴァーティー 第3パーダ", "ライフパス: 4", "計算の過程: 2 + 0 + 0 + 0 + 0 + 1 + 0 + 1 = 4", "計算方法:", "〈解説〉", "本文は入れない", "天の才: 粘り強さ", "読み解きのヒント", "ヒントの本文", "morikawatakashi.com/profile-lab/"]) {
      expect(t, x).toContain(x);
    }
    expect(t).not.toContain("undefined");
  });
  it("同じ解説を繰り返さない", async () => {
    const birth = norm(BASE, BASE_UTC);
    const r = await calculate(birth, engine);
    // 太陽とは別の項目でも同じ星座が出る場合に、解説は1回だけ
    const sign = r.western!.items.find((i) => i.id === "sun")!.contentKeys[1]!;
    const rec = { key: sign, locale: "ja", body: "星座の本文", sources: [], rights: { status: "owner_original" }, review: "approved" } as ContentRecord;
    const t = singleModuleText(r.western!, { birth, time: "12:00", placeLabel: "" }, new Map([[sign, rec]]));
    expect(t.split("星座の本文").length - 1).toBe(1);
  });
  it("体系別: その体系と出生情報だけを含む", async () => {
    const birth = norm(BASE, BASE_UTC);
    const r = await calculate(birth, engine);
    const t = singleModuleText(r.western!, { birth, time: "12:00", placeLabel: "東京都千代田区" }, new Map());
    expect(t).toContain("生年月日: 2000-01-01");
    expect(t).toContain("■ 西洋占星術");
    expect(t).not.toContain("■ 遺伝子易経");
    expect(t).toContain("[アスペクト]");
    expect(t).not.toContain("〈解説〉");
  });
  it("時刻不明・仮計算・出生地なしの状態を明記する", async () => {
    const b1 = norm({ date: "2000-01-01", timeAccuracy: "unknown" });
    const unknown = allModulesText(await calculate(b1, engine), { birth: b1, placeLabel: "" }, new Map());
    for (const x of ["出生時刻: 不明", "出生地: 指定なし", "出生時刻がないため計算していません。", "ライフパス: 4"]) expect(unknown, x).toContain(x);
    expect(unknown).not.toContain("タイムゾーン");
    const b2 = norm({ ...BASE, timeAccuracy: "approximate" }, BASE_UTC);
    const approx = allModulesText(await calculate(b2, engine), { birth: b2, time: "12:00", placeLabel: "東京都千代田区" }, new Map());
    expect(approx).toContain("出生時刻: 12:00(おおよそ)");
    expect(approx).toContain("おおよその時刻による仮計算です。");
  });
});
