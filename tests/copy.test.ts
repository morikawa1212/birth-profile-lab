// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { calculate } from "../src/engine/calculate";
import { allModulesText, singleModuleText } from "../src/ui/copyText";
import { ageOn, buildContemplationPrompt, buildPrompt, buildSinglePrompt, CONTEMPLATION_HEAD, PROMPT_ORDER, promptHead, singlePromptHead } from "../src/ui/prompts";
import type { ContentMap, ContentRecord } from "../src/ui/content";
import { BASE, BASE_UTC, engine, norm } from "./helpers";

const key38 = { key: "gk.key.38", locale: "ja", summary: "サンプルA → B → C", body: "本文は入れない", sources: [], rights: { status: "owner_provided" }, review: "approved" } as ContentRecord;

const sections = { ...key38, sections: [{ heading: "読み解きのヒント", body: "ヒントの本文" }], attributes: [{ name: "天の才", value: "サンプルB", source: "辞典" }] } as ContentRecord;
const full: ContentMap = new Map([[sections.key, sections]]);

describe("コピーの文章", () => {
  it("全体: 出生情報、全体系の結果、要約、解説本文を含む", async () => {
    const birth = norm(BASE, BASE_UTC);
    const t = allModulesText(await calculate(birth, engine), { birth, time: "12:00", placeLabel: "東京都千代田区" }, full);
    for (const x of ["【出生情報】", "生年月日: 2000-01-01", "出生時刻: 12:00", "出生地: 東京都千代田区", "タイムゾーン: Asia/Tokyo", "■ 遺伝子易経", "■ 西洋占星術", "■ インド占星術", "■ 数秘術", "[変容活性化の道]", "ライフワーク: 38.1(サンプルA → B → C)", "知能指数（IQ）: 34.2", "コア: 26.6", "天職: 26.6", "太陽: 山羊座 9.99°", "スヴァーティー 第3パーダ", "ライフパス: 4", "計算の過程: 2 + 0 + 0 + 0 + 0 + 1 + 0 + 1 = 4", "計算方法:", "〈解説〉", "本文は入れない", "天の才: サンプルB", "読み解きのヒント", "ヒントの本文", "morikawatakashi.com/profile-lab/"]) {
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

describe("AI鑑定用プロンプト", () => {
  const ctx = { year: 2026, age: 37 };
  it("5つのパターンがあり、それぞれ指示と鑑定内容を一緒に含む", () => {
    expect(PROMPT_ORDER).toEqual(["overall", "each", "soul", "timeline", "seven_years"]);
    const heads = new Set<string>();
    for (const id of PROMPT_ORDER) {
      const t = buildPrompt(id, "生年月日: 2000-01-01", ctx);
      for (const x of ["# 進め方", "# 守ること", "# 鑑定内容"]) expect(t, `${id} ${x}`).toContain(x);
      for (const x of ["病気の診断", "投資", "セッション", "コーチング"]) expect(t, `${id} ${x}`).not.toContain(x);
      expect(t.endsWith("生年月日: 2000-01-01")).toBe(true);
      expect(t).not.toContain("undefined");
      heads.add(promptHead(id, ctx));
    }
    expect(heads.size).toBe(5);
  });
  it("総合: 体系をまたいで読み、証明として扱わない", () => {
    const t = promptHead("overall", ctx);
    expect(t).toContain("体系をまたいで");
    expect(t).toContain("証明としては扱わない");
    expect(t).toContain("# 相談したいこと");
  });
  it("占術ごと: 別の占術を混ぜない", () => {
    const t = promptHead("each", ctx);
    expect(t).toContain("別の占術の内容を混ぜず");
    expect(t).not.toContain("体系をまたいで");
  });
  it("魂とカルマ: 事実として断定しない", () => {
    const t = promptHead("soul", ctx);
    for (const x of ["魂の目的", "ラーフとケートゥ", "コア", "事実として断定しない"]) expect(t, x).toContain(x);
  });
  it("変曲点と運勢: 今年と年齢を入れ、天体の位置の断定と予言を禁じる", () => {
    const t = promptHead("timeline", ctx);
    for (const x of ["今年は2026年", "満37歳", "2026年から2030年", "各年の天体の位置が含まれていません", "計算過程", "誤りがありうる", "予言せず", "マハーダシャー", "個人年数"]) expect(t, x).toContain(x);
    expect(t).not.toContain("推測したり計算し直したり");
  });
  it("7年周期: 一度に1問で、現在の周期まで振り返り、つらい記憶に配慮する", () => {
    const t = promptHead("seven_years", ctx);
    for (const x of ["一度に1つだけ質問", "35〜42歳", "満37歳", "飛ばしてよい", "専門家", "決めつけない", "魂の知能指数"]) expect(t, x).toContain(x);
    expect(t).not.toContain("# 相談したいこと");
    expect(promptHead("seven_years", { year: 2026, age: 7 })).toContain("7〜14歳の周期まで");
  });
  it.each([["western", "西洋占星術", ["ハウス", "アスペクト"]], ["vedic", "インド占星術", ["ラグナ", "ナクシャトラ"]], ["numerology", "数秘術", ["ライフパス", "誕生数"]]] as const)("占術別(%s): その占術だけを指示する", (id, name, words) => {
    const t = singlePromptHead(id);
    expect(t).toContain(`あなたは${name}に詳しい鑑定士です`);
    for (const w of words) expect(t, w).toContain(w);
    for (const other of ["遺伝子易経", "西洋占星術", "インド占星術", "数秘術"].filter((o) => o !== name)) expect(t, other).not.toContain(other);
    expect(t).not.toContain("占術ごとに");
    expect(t).toContain("他の占術の内容は混ぜない");
    expect(buildSinglePrompt(id, "本文").endsWith("# 鑑定内容\n本文")).toBe(true);
  });
  it("プロンプト用の本文は鍵の解説全文を省き、要約とスフィアの解説を残す", async () => {
    const birth = norm(BASE, BASE_UTC);
    const r = await calculate(birth, engine);
    const sphere = { key: "gk.sphere.lifes_work", locale: "ja", body: "スフィアの本文", sources: [], rights: { status: "owner_original" }, review: "approved" } as ContentRecord;
    const c: ContentMap = new Map([[sections.key, sections], [sphere.key, sphere]]);
    const s = { birth, time: "12:00", placeLabel: "東京都千代田区" };
    const compact = singleModuleText(r.gene_keys!, s, c, { compact: true });
    expect(compact).toContain("ライフワーク: 38.1(サンプルA → B → C)");
    expect(compact).toContain("スフィアの本文");
    expect(compact).not.toContain("本文は入れない");
    expect(compact).not.toContain("ヒントの本文");
    // 通常のコピーは全文のまま
    const full = singleModuleText(r.gene_keys!, s, c);
    expect(full).toContain("本文は入れない");
    expect(full).toContain("ヒントの本文");
    expect(allModulesText(r, s, c, { compact: true })).not.toContain("ヒントの本文");
  });
  it("鍵の要約に沿って補う指示は遺伝子易経を含むプロンプトだけに入る", () => {
    expect(CONTEMPLATION_HEAD).toContain("要約に沿って補い");
    expect(singlePromptHead("western")).not.toContain("要約に沿って");
    for (const id of PROMPT_ORDER) expect(promptHead(id, ctx), id).toContain("要約に沿って補い");
  });
  it("遺伝子易経は鑑定ではなく観照を支える", () => {
    const t = CONTEMPLATION_HEAD;
    for (const x of ["観照に寄り添う案内役", "鑑定や診断ではなく", "一度に1つだけ質問", "答えや結論を与えず", "直そうとさせない", "天の光を努力して到達する目標", "持ち歩く問い", "飛ばしてよい"]) expect(t, x).toContain(x);
    for (const x of ["西洋占星術", "インド占星術", "数秘術", "セッション", "コーチング"]) expect(t, x).not.toContain(x);
    const p = buildContemplationPrompt("本文");
    expect(p.endsWith("# 遺伝子易経の内容\n本文")).toBe(true);
  });
  it("満年齢は誕生日の前後で変わる", () => {
    expect(ageOn("2000-06-15", "2026-06-14")).toBe(25);
    expect(ageOn("2000-06-15", "2026-06-15")).toBe(26);
  });
});
