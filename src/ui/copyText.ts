// SPDX-License-Identifier: AGPL-3.0-or-later
// 分析結果をコピー用のテキストにする。出生情報と解説本文も含める。
import type { ModuleResult, NormalizedBirth, ResultItem } from "../core/types";
import type { EsotericData } from "../modules/esoteric/index";
import type { NumerologyData } from "../modules/numerology/index";
import { buildSynthesis, synthesisText } from "./esotericSynthesis";
import type { ContentMap } from "./content";
import { contentHeading, GROUP_LABELS, MISSING_LABELS, MODULE_LABELS, MODULE_ORDER, settingRows, SUMMARY_ITEMS } from "./labels";

const SITE_LINE = "出生プロフィール https://morikawatakashi.com/profile-lab/";

export interface BirthSummary {
  birth: NormalizedBirth;
  time?: string;
  placeLabel: string;
}

function birthText({ birth, time, placeLabel }: BirthSummary): string {
  const timeText = birth.timeAccuracy === "unknown" ? "不明" : `${time ?? ""}${birth.timeAccuracy === "approximate" ? "(おおよそ)" : ""}`;
  const lines = ["【出生情報】", `生年月日: ${birth.isoDate}`, `出生時刻: ${timeText}`, `出生地: ${placeLabel || "指定なし"}`];
  if (birth.timezone && birth.utc) lines.push(`タイムゾーン: ${birth.timezone}`);
  return lines.join("\n");
}

/** 一覧に添える短い解説。秘教占星術の ASC・太陽・月は、星座の解説のうち役割に合う句を使う */
export function itemSummary(moduleId: string, item: ResultItem, content: ContentMap): string | undefined {
  if (moduleId === "esoteric" && (item.id === "asc" || item.id === "sun" || item.id === "moon")) {
    const role = { asc: "ascSoul", sun: "sunPersonality", moon: "moonPast" }[item.id];
    const sign = item.contentKeys.find((k) => k.startsWith("eso.sign."));
    const text = sign ? content.get(sign)?.phrases?.[role]?.text : undefined;
    if (text) return text;
  }
  return item.contentKeys.map((k) => content.get(k)?.summary).find(Boolean);
}

/** 短いプロンプトで省くグループ(数が多く、要点の読み解きには不要なもの) */
const BRIEF_SKIP_GROUPS = new Set(["aspects", "bodies", "rays"]);

function itemLine(item: ResultItem, content: ContentMap, moduleId = ""): string {
  const summary = itemSummary(moduleId, item, content);
  return `${item.label}: ${item.display}${summary ? `(${summary})` : ""}`;
}

export interface TextOptions {
  /** 鍵の解説全文を省く。AI へ渡すプロンプトでは長くなりすぎるため、要約だけを残す */
  compact?: boolean;
  /** 短いプロンプト用。主要な項目の値だけにし、解説・総合的な読み解き・計算方法を省く */
  brief?: boolean;
  /** brief のとき、主要な項目に絞る(全体のプロンプト)。false ならその体系の項目を広めに残す */
  summaryOnly?: boolean;
}

/** 体系で使われた解説を、重複を除いて出現順にまとめる */
function explanationText(m: ModuleResult, content: ContentMap, options: TextOptions): string[] {
  // プロンプト用では、鍵の解説全文と秘教占星術の解説ページ(長い本文)を省く。秘教占星術は総合的な読み解きを残す
  const keys = [...new Set(m.items.flatMap((i) => i.contentKeys))].filter((k) => !(options.compact && (k.startsWith("gk.key.") || k.startsWith("eso."))));
  const blocks: string[] = [];
  for (const key of keys) {
    const r = content.get(key);
    if (!r?.body) continue;
    const parts = [`◇ ${r.title ?? contentHeading(key)}`, r.body];
    if (r.attributes?.length) parts.push(r.attributes.map((a) => `${a.name}: ${a.value}`).join("\n"));
    for (const x of r.sections ?? []) parts.push(`${x.heading}\n${x.body}`);
    blocks.push(parts.join("\n"));
  }
  return blocks.length ? ["", "〈解説〉", blocks.join("\n\n")] : [];
}

export function moduleText(m: ModuleResult, content: ContentMap, options: TextOptions = {}): string {
  const lines = [`■ ${MODULE_LABELS[m.moduleId] ?? m.moduleId}`];
  if (m.status === "unavailable") {
    lines.push(`${(m.missing ?? []).map((x) => MISSING_LABELS[x]).join("、")}がないため計算していません。`);
    return lines.join("\n");
  }
  if (m.status === "provisional") lines.push("おおよその時刻による仮計算です。");
  const groups = new Map<string, ResultItem[]>();
  const summary = SUMMARY_ITEMS[m.moduleId] ?? [];
  const shown = !options.brief ? m.items
    : options.summaryOnly ? m.items.filter((i) => summary.includes(i.id))
    : m.items.filter((i) => !BRIEF_SKIP_GROUPS.has(i.group ?? ""));
  for (const i of shown) groups.set(i.group ?? "", [...(groups.get(i.group ?? "") ?? []), i]);
  for (const [g, items] of groups) {
    const label = GROUP_LABELS[g];
    if (label) lines.push(`[${label}]`);
    for (const i of items) lines.push(itemLine(i, content, m.moduleId));
  }
  if (options.brief) return lines.join("\n");
  if (m.moduleId === "numerology" && m.data) {
    const n = m.data as NumerologyData;
    lines.push(`計算の過程: ${n.digits.join(" + ")} = ${n.sumTrace.join(" → ")}`);
  }
  if (m.moduleId === "esoteric" && m.data) {
    lines.push("", "〈総合的な読み解き〉", synthesisText(buildSynthesis(m.data as EsotericData, content)));
  }
  lines.push(`計算方法: ${settingRows(m.settings).map(([k, v]) => `${k} ${v}`).join("、")}`);
  lines.push(...explanationText(m, content, options));
  return lines.join("\n");
}

export function singleModuleText(m: ModuleResult, summary: BirthSummary, content: ContentMap, options: TextOptions = {}): string {
  return [birthText(summary), moduleText(m, content, options), SITE_LINE].join("\n\n");
}

export function allModulesText(modules: Readonly<Record<string, ModuleResult>>, summary: BirthSummary, content: ContentMap, options: TextOptions = {}): string {
  return [birthText(summary), ...MODULE_ORDER.map((id) => moduleText(modules[id]!, content, options)), SITE_LINE].join("\n\n");
}
