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

/** 遺伝子易経の3つの道を、スフィアのつながりとして描く(このサイト独自の図) */
const PATHS: readonly { id: string; label: string; spheres: readonly string[] }[] = [
  { id: "activation", label: "変容活性化の道", spheres: ["lifes_work", "evolution", "radiance", "purpose"] },
  { id: "venus", label: "ヴィーナスの道", spheres: ["attraction", "iq", "eq", "sq", "core"] },
  { id: "pearl", label: "パールの道", spheres: ["vocation", "culture", "pearl"] },
];

export function GeneKeysChart({ module: m, content }: { module: ModuleResult; content: ContentMap }) {
  const d = m.data as GeneKeysData;
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <section class="card" aria-labelledby="gk-chart-title">
      <h2 id="gk-chart-title">3つの道</h2>
      <div class="gk-paths">
        {PATHS.map((p) => (
          <section key={p.id} class={`gk-path gk-${p.id}`} aria-label={p.label}>
            <h3>{p.label}</h3>
            <ol>
              {p.spheres.map((s) => {
                const item = m.items.find((i) => i.id === s);
                const sp = d.spheres[s];
                if (!item || !sp) return null;
                return (
                  <li key={s}>
                    <button type="button" class="gk-node" aria-pressed={selected === s} onClick={() => setSelected(s)}>
                      <span class="gk-sphere">{item.label}</span>
                      <strong class="gk-value">{sp.value}</strong>
                      {content.get(`gk.key.${sp.key}`)?.summary && <small>{content.get(`gk.key.${sp.key}`)!.summary}</small>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      <p class="note chart-legend">数字は「鍵.ライン」です。スフィアを選ぶと、解説を表示します。コアと天職は同じ配置を、それぞれの道の視点で読みます。</p>
      {selected && <SelectionPanel module={m} itemId={selected} content={content} />}
    </section>
  );
}
