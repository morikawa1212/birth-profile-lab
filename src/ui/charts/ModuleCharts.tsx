// SPDX-License-Identifier: AGPL-3.0-or-later
// 西洋占星術・インド占星術・遺伝子易経のチャート。天体や配置を選ぶと、その場に解説を出す。
import { useState } from "preact/hooks";
import type { ModuleResult } from "../../core/types";
import { SIGNS } from "../../core/zodiac";
import type { GeneKeysData } from "../../modules/gene_keys/index";
import type { VedicData } from "../../modules/vedic/index";
import type { WesternData } from "../../modules/western/index";
import type { ContentMap } from "../content";
import { Explanation } from "../Explanation";
import { Wheel, type WheelAspect } from "./Wheel";

const GLYPH: Readonly<Record<string, string>> = {
  sun: "太", moon: "月", mercury: "水", venus: "金", mars: "火", jupiter: "木", saturn: "土", uranus: "天", neptune: "海", pluto: "冥", rahu: "ラ", ketu: "ケ",
};
const ASPECT_KIND: Readonly<Record<string, WheelAspect["kind"]>> = { trine: "harmony", sextile: "harmony", square: "tension", opposition: "tension", conjunction: "neutral" };

/** 選んだ項目の値と解説。項目のページへのリンクも添える */
export function SelectionPanel({ module: m, itemId, content }: { module: ModuleResult; itemId: string; content: ContentMap }) {
  const item = m.items.find((i) => i.id === itemId);
  if (!item) return null;
  return (
    <div class="body-panel" aria-live="polite">
      <h3>{item.label}: {item.display}</h3>
      <Explanation keys={item.contentKeys} content={content} />
      <p><a href={`#${m.moduleId}/${item.id}`}>{item.label}のページで詳しく読む</a></p>
    </div>
  );
}

export function WesternChart({ module: m, content }: { module: ModuleResult; content: ContentMap }) {
  const d = m.data as WesternData;
  const [selected, setSelected] = useState<string | null>(null);
  const points = Object.entries(d.planets).map(([id, p]) => ({ id, glyph: GLYPH[id]!, label: m.items.find((i) => i.id === id)?.label ?? id, longitude: p.longitude }));
  const aspects = d.aspects.filter((x) => x.aspect !== "conjunction").map((x) => ({ a: x.a, b: x.b, kind: ASPECT_KIND[x.aspect]! }));
  return (
    <section class="card" aria-labelledby="west-chart-title">
      <h2 id="west-chart-title">チャート</h2>
      <Wheel title={`西洋占星術の出生チャート。${points.map((p) => p.label).join("、")}`} points={points}
        cusps={d.houses.status === "calculated" ? d.houses.cusps : null} asc={d.ascendant?.longitude ?? null} mc={d.mc?.longitude ?? null}
        aspects={aspects} selected={selected} onSelect={setSelected} />
      <p class="note chart-legend">
        {d.ascendant ? "太い線がASC、細い線がMCです。" : "出生地がないため、ASCとハウスは描いていません。牡羊座0°を左に置いています。"}
        中央の線はアスペクトで、<span class="legend-harmony">青は三分・六分</span>、<span class="legend-tension">赤は矩・衝</span>です(合は省いています)。天体を選ぶと、解説を表示します。
      </p>
      {selected && <SelectionPanel module={m} itemId={selected} content={content} />}
    </section>
  );
}

/** 南インド式の配置。星座の位置が固定で、魚座が左上 */
const SOUTH_CELLS: readonly [number, number][] = [
  [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0],
];

export function VedicChart({ module: m, content }: { module: ModuleResult; content: ContentMap }) {
  const d = m.data as VedicData;
  const [selected, setSelected] = useState<string | null>(null);
  const bySign = new Map<number, string[]>();
  for (const [id, p] of Object.entries(d.planets)) bySign.set(p.signIndex, [...(bySign.get(p.signIndex) ?? []), id]);
  const label = (id: string) => m.items.find((i) => i.id === id)?.label ?? id;
  return (
    <section class="card" aria-labelledby="vedic-chart-title">
      <h2 id="vedic-chart-title">チャート(南インド式)</h2>
      <div class="rasi-grid" role="group" aria-label="ラーシ・チャート。星座の位置は固定で、左上が魚座、時計回りに牡羊座から並びます">
        {SOUTH_CELLS.map(([row, col], sign) => {
          const isLagna = d.lagna?.signIndex === sign;
          return (
            <div key={sign} class={`rasi-cell${isLagna ? " is-lagna" : ""}`} style={{ gridRow: row + 1, gridColumn: col + 1 }}>
              <span class="rasi-name">{SIGNS[sign]}{isLagna && <strong class="lagna-mark">ラグナ</strong>}</span>
              <span class="rasi-bodies">
                {(bySign.get(sign) ?? []).map((id) => (
                  <button key={id} type="button" class="graha" aria-pressed={selected === id} aria-label={`${label(id)}${d.planets[id]!.retrograde && id !== "rahu" && id !== "ketu" ? "(逆行)" : ""}`} onClick={() => setSelected(id)}>
                    {GLYPH[id]}{d.planets[id]!.retrograde && id !== "rahu" && id !== "ketu" ? <small>R</small> : null}
                  </button>
                ))}
              </span>
            </div>
          );
        })}
        <div class="rasi-center"><span>ラーシ(D1)</span><small>サイデリアル</small></div>
      </div>
      <p class="note chart-legend">
        {d.lagna ? "枠で囲んだ星座がラグナです。" : "出生地がないため、ラグナは保留しています。"}
        Rは逆行です。天体を選ぶと、解説を表示します。
      </p>
      {selected && <SelectionPanel module={m} itemId={selected} content={content} />}
    </section>
  );
}

/**
 * 遺伝子易経のチャート。スフィアの配置とつながりは一般的なホロジェネティック・プロファイルの並びに合わせ、
 * 図の見た目(色・形・装飾)はこのサイト独自にする。コアと天職は同じ配置なので1つの円で示す。
 */
type GkPath = "activation" | "venus" | "pearl" | "core";
const GK_NODES: readonly { id: string; items: readonly string[]; label: string; x: number; y: number; path: GkPath }[] = [
  { id: "lifes_work", items: ["lifes_work"], label: "ライフワーク", x: 200, y: 44, path: "activation" },
  { id: "pearl", items: ["pearl"], label: "パール", x: 200, y: 138, path: "pearl" },
  { id: "vocation", items: ["vocation", "core"], label: "天職・コア", x: 133, y: 187, path: "core" },
  { id: "culture", items: ["culture"], label: "文化", x: 267, y: 187, path: "pearl" },
  { id: "radiance", items: ["radiance"], label: "輝き", x: 50, y: 238, path: "activation" },
  { id: "sq", items: ["sq"], label: "SQ", x: 200, y: 238, path: "venus" },
  { id: "evolution", items: ["evolution"], label: "進化", x: 350, y: 238, path: "activation" },
  { id: "iq", items: ["iq"], label: "IQ", x: 133, y: 289, path: "venus" },
  { id: "eq", items: ["eq"], label: "EQ", x: 267, y: 289, path: "venus" },
  { id: "attraction", items: ["attraction"], label: "引き寄せ", x: 200, y: 340, path: "venus" },
  { id: "purpose", items: ["purpose"], label: "目的", x: 200, y: 436, path: "activation" },
];
const GK_EDGES: readonly [string, string, Exclude<GkPath, "core">][] = [
  ["lifes_work", "evolution", "activation"], ["radiance", "evolution", "activation"], ["radiance", "purpose", "activation"],
  ["purpose", "attraction", "venus"], ["attraction", "iq", "venus"], ["iq", "eq", "venus"], ["eq", "sq", "venus"], ["sq", "vocation", "venus"],
  ["vocation", "culture", "pearl"], ["culture", "pearl", "pearl"], ["pearl", "vocation", "pearl"],
  ["lifes_work", "vocation", "pearl"], ["lifes_work", "pearl", "pearl"], ["lifes_work", "culture", "pearl"],
];
const GK_R = 32;

export function GeneKeysChart({ module: m, content }: { module: ModuleResult; content: ContentMap }) {
  const d = m.data as GeneKeysData;
  const [selected, setSelected] = useState<string | null>(null);
  const at = new Map(GK_NODES.map((n) => [n.id, n]));
  // 線は円の縁で止め、円の中の文字にかからないようにする
  const edge = (a: string, b: string) => {
    const p = at.get(a)!, q = at.get(b)!;
    const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
    return { x1: p.x + (dx / len) * GK_R, y1: p.y + (dy / len) * GK_R, x2: q.x - (dx / len) * GK_R, y2: q.y - (dy / len) * GK_R };
  };
  const valueOf = (id: string) => d.spheres[id]?.value ?? "";
  const label = GK_NODES.map((n) => `${n.label} ${valueOf(n.items[0]!)}`).join("、");
  return (
    <section class="card" aria-labelledby="gk-chart-title">
      <h2 id="gk-chart-title">チャート</h2>
      <svg class="gk-chart" viewBox="0 0 400 480" role="img" aria-label={`遺伝子易経のチャート。${label}`}>
        <defs>
          <linearGradient id="gk-core" x1="0" y1="0" x2="1" y2="1">
            <stop offset="50%" class="gk-stop-pearl" />
            <stop offset="50%" class="gk-stop-venus" />
          </linearGradient>
        </defs>
        <circle cx={200} cy={240} r={196} class="gk-ring" />
        {GK_EDGES.map(([a, b, path]) => <line key={`${a}-${b}`} {...edge(a, b)} class={`gk-edge gk-edge-${path}`} />)}
        {GK_NODES.map((n) => {
          const item = m.items.find((i) => i.id === n.items[0]);
          if (!item) return null;
          const name = n.items.map((x) => m.items.find((i) => i.id === x)?.label ?? x).join("・");
          return (
            <g key={n.id} class={`gk-node gk-node-${n.path}${selected === n.items[0] ? " is-selected" : ""}`} role="button" tabIndex={0}
              aria-label={`${name} ${valueOf(n.items[0]!)}`} aria-pressed={selected === n.items[0]}
              onClick={() => setSelected(n.items[0]!)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(n.items[0]!); } }}>
              <circle cx={n.x} cy={n.y} r={GK_R} class="gk-circle" />
              <text x={n.x} y={n.y - 10} class="gk-name">{n.label}</text>
              <text x={n.x} y={n.y + 9} class="gk-num">{valueOf(n.items[0]!)}</text>
            </g>
          );
        })}
      </svg>
      <p class="note chart-legend">
        数字は「鍵.ライン」です。<span class="gk-key gk-key-activation">変容活性化の道</span>、<span class="gk-key gk-key-venus">ヴィーナスの道</span>、<span class="gk-key gk-key-pearl">パールの道</span>を線で結んでいます。天職とコアは同じ配置を、それぞれの道の視点で読みます。スフィアを選ぶと、解説を表示します。
      </p>
      {selected && <SelectionPanel module={m} itemId={selected} content={content} />}
    </section>
  );
}
