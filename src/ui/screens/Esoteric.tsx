// SPDX-License-Identifier: AGPL-3.0-or-later
// 秘教占星術のタブ: チャート、支配星の切り替え、総合的な読み解き、学ぶためのページ。
import { useState } from "preact/hooks";
import { SIGN_IDS, SIGNS } from "../../core/zodiac";
import { BODY_LABELS, CROSS_LABELS, RAY_NAMES, RULER_LABELS, type EsotericBody, type RulerScheme } from "../../modules/esoteric/data";
import { SCHEMES, TRIAD, type EsotericData } from "../../modules/esoteric/index";
import type { ContentMap } from "../content";
import { buildSynthesis } from "../esotericSynthesis";
import { Wheel } from "../charts/Wheel";
import { Explanation } from "../Explanation";

const GLYPH: Readonly<Record<EsotericBody, string>> = {
  sun: "太", moon: "月", mercury: "水", venus: "金", mars: "火", jupiter: "木", saturn: "土", uranus: "天", neptune: "海", pluto: "冥", earth: "地", vulcan: "ヴ",
};
const ARTICLE_COUNT = 8;
const SHORT = { asc: "ASC", sun: "太陽", moon: "月" } as const;

export function EsotericChart({ data, content }: { data: EsotericData; content: ContentMap }) {
  const [scheme, setScheme] = useState<RulerScheme>("esoteric");
  const [selected, setSelected] = useState<EsotericBody | null>(null);
  const ruler = data.points.asc?.rulers[scheme];
  return (
    <>
      {data.ascMissing && <p class="notice">出生地がないため、ASCとハウスを推測せずに保留しています。ASCと、その支配星に関わる項目は表示していません。</p>}
      <section class="card" aria-labelledby="eso-chart-title">
        <h2 id="eso-chart-title">チャート</h2>
        <div class="scheme-switch" role="group" aria-label="支配星の表">
          {SCHEMES.map((s) => (
            <button key={s} type="button" class="scheme-btn" aria-pressed={scheme === s} onClick={() => setScheme(s)}>{RULER_LABELS[s]}</button>
          ))}
        </div>
        <ChartWheel data={data} scheme={scheme} selected={selected} onSelect={setSelected} />
        <p class="note chart-legend">
          {ruler
            ? ruler === "vulcan"
              ? <>太い線がASCです。ASCの{RULER_LABELS[scheme]}はヴァルカンで、位置算出対象外のためチャートには描いていません。</>
              : <>太い線がASCです。ASCの{RULER_LABELS[scheme]}({BODY_LABELS[ruler]})を枠で囲み、ASCとの関係を点線で示しています。</>
            : "ASCは保留しているため、牡羊座0°を左に置いています。"}
          地は地球の象徴的位置(太陽の反対側)です。ヴァルカンは位置算出対象外のため描いていません。天体を選ぶと、3つの表での支配関係を確認できます。
        </p>
        {selected && <BodyPanel data={data} body={selected} content={content} />}
        <RulerTable data={data} scheme={scheme} />
      </section>
    </>
  );
}

export function EsotericSynthesisCard({ data, content }: { data: EsotericData; content: ContentMap }) {
  const sections = buildSynthesis(data, content);
  return (
    <section class="card synthesis-card" aria-labelledby="eso-synthesis-title">
      <h2 id="eso-synthesis-title">総合的な読み解き</h2>
      <p class="note">配置の組み合わせから組み立てた読み解きです。<span class="basis source">原典</span>はベイリー『秘教占星学』の説明に基づく部分、<span class="basis synthesis">独自の考察</span>は複数の配置を統合したこのサイトの考察です。断定ではなく、観照の手がかりとしてお読みください。</p>
      {sections.map((s) => (
        <section key={s.heading} class="synthesis-section">
          <h3>{s.heading}</h3>
          {s.paragraphs.map((p, i) => (
            <p key={i}>
              {p.text} <span class={`basis ${p.basis}`}>{p.basis === "source" ? "原典" : "独自の考察"}</span>
              {p.refs.length ? <small class="refs">根拠: {p.refs.join("、")}</small> : null}
            </p>
          ))}
        </section>
      ))}
    </section>
  );
}

function BodyPanel({ data, body, content }: { data: EsotericData; body: EsotericBody; content: ContentMap }) {
  const b = data.bodies[body];
  const pl = b.placement;
  return (
    <div class="body-panel" aria-live="polite">
      <h3>{BODY_LABELS[body]}</h3>
      <dl class="table">
        <dt>位置</dt><dd>{pl.status === "not_calculated" ? "位置算出対象外" : `${pl.position.sign} ${pl.position.degreeInSign.toFixed(2)}°${pl.house ? ` 第${pl.house}ハウス` : ""}${pl.status === "derived" ? "(象徴的位置)" : ""}`}</dd>
        <dt>光線</dt><dd>第{b.ray}光線({RAY_NAMES[b.ray]})</dd>
        <dt>区分</dt><dd>{b.sacred ? "聖なる惑星" : "聖ならざる惑星"}</dd>
        {SCHEMES.map((s) => <><dt>{RULER_LABELS[s]}</dt><dd>{b.rules[s].map((x) => SIGNS[SIGN_IDS.indexOf(x)]).join("・") || "なし"}</dd></>)}
      </dl>
      <Explanation keys={[`eso.planet.${body}`]} content={content} />
      <p><a href={`#esoteric/body_${body}`}>{BODY_LABELS[body]}のページで詳しく読む</a></p>
    </div>
  );
}

function RulerTable({ data, scheme }: { data: EsotericData; scheme: RulerScheme }) {
  return (
    <div class="table-scroll">
      <table>
        <caption class="sr-note">ASC・太陽・月の星座と3つの支配星</caption>
        <thead><tr><th>項目</th><th>星座</th>{SCHEMES.map((s) => <th key={s} aria-current={s === scheme ? "true" : undefined}>{RULER_LABELS[s]}</th>)}<th>十字</th></tr></thead>
        <tbody>
          {TRIAD.map((id) => {
            const p = data.points[id];
            if (!p) return null;
            return (
              <tr key={id}>
                <th scope="row">{SHORT[id]}</th>
                <td>{p.position.sign}</td>
                {SCHEMES.map((s) => <td key={s} class={s === scheme ? "current" : undefined}>{BODY_LABELS[p.rulers[s]]}(第{data.bodies[p.rulers[s]].ray}光線)</td>)}
                <td>{CROSS_LABELS[p.cross]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LearnLinks({ content }: { content: ContentMap }) {
  const title = (key: string, fallback: string) => content.get(key)?.title ?? fallback;
  return (
    <section class="card" aria-labelledby="eso-learn-title">
      <h2 id="eso-learn-title">秘教占星術を学ぶ</h2>
      <ol class="learn-list">
        {Array.from({ length: ARTICLE_COUNT }, (_, i) => i + 1).map((n) => <li key={n}><a href={`#esoteric/learn.article.${n}`}>{title(`eso.article.${n}`, `記事 ${n}`)}</a></li>)}
      </ol>
      <h3>12星座の秘教的な解説</h3>
      <ul class="sign-links">
        {SIGN_IDS.map((s, i) => <li key={s}><a href={`#esoteric/learn.sign.${s}`}>{SIGNS[i]}</a></li>)}
      </ul>
    </section>
  );
}

/** 出生チャート。共通の円形チャートに、支配星の強調と ASC への点線を重ねる */
function ChartWheel({ data, scheme, selected, onSelect }: { data: EsotericData; scheme: RulerScheme; selected: EsotericBody | null; onSelect: (b: EsotericBody) => void }) {
  const asc = data.points.asc;
  const ruler = asc ? asc.rulers[scheme] : null;
  const points = (Object.keys(data.bodies) as EsotericBody[]).flatMap((b) => {
    const p = data.bodies[b].placement;
    if (p.status === "not_calculated") return [];
    return [{ id: b, glyph: GLYPH[b], label: `${BODY_LABELS[b]}${b === ruler ? `(ASCの${RULER_LABELS[scheme]})` : ""}`, longitude: p.position.longitude, emphasized: b === ruler, derived: p.status === "derived" }];
  });
  return (
    <Wheel title={`秘教占星術の出生チャート。${asc ? `ASCは${asc.position.sign}。` : ""}${points.map((p) => BODY_LABELS[p.id as EsotericBody]).join("、")}`}
      points={points} cusps={data.houses.status === "calculated" ? data.houses.cusps : null} asc={asc?.position.longitude ?? null}
      linkFrom={ruler} selected={selected} onSelect={(id) => onSelect(id as EsotericBody)} />
  );
}
