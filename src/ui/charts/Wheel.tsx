// SPDX-License-Identifier: AGPL-3.0-or-later
// 黄道の円形チャート(西洋占星術・秘教占星術で共通)。ASC を左に置き、黄経が反時計回りに増える。
// 近い天体は内側の段へずらし、文字が重ならないようにする。

export interface WheelPoint {
  id: string;
  glyph: string;
  label: string;
  longitude: number;
  /** 枠で強調する(支配星など) */
  emphasized?: boolean;
  /** 点線の枠(地球の象徴的位置など) */
  derived?: boolean;
}
export interface WheelAspect { a: string; b: string; kind: "harmony" | "tension" | "neutral" }

const SIGN_SHORT = ["羊", "牛", "双", "蟹", "獅", "乙", "天", "蠍", "射", "山", "水", "魚"];
const C = 200;
const OUTER = 192;
const SIGN_INNER = 160;
const INNER = 64;
const LANES = [138, 112, 88] as const;
const GLYPH_R = 13;

/** 表示位置を決める。外側の段から順に、近くの文字と重ならない段を選ぶ */
export function layoutLanes(points: readonly { id: string; longitude: number }[]): Map<string, { at: number; lane: number }> {
  const sorted = [...points].sort((a, b) => a.longitude - b.longitude);
  const placed: { id: string; at: number; lane: number }[] = [];
  const minDeg = (lane: number) => (((GLYPH_R * 2 + 2) / LANES[lane]!) * 180) / Math.PI;
  const dist = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
  const free = (at: number, lane: number) => placed.every((q) => q.lane !== lane || dist(q.at, at) >= minDeg(lane));
  for (const p of sorted) {
    // 本来の位置に置ける段を外側から探し、なければ少しずつ横へずらす
    let spot: { at: number; lane: number } | null = null;
    for (let step = 0; step <= 120 && !spot; step++) {
      const offset = step === 0 ? 0 : (step % 2 ? 1 : -1) * Math.ceil(step / 2) * 0.5;
      for (let lane = 0; lane < LANES.length && !spot; lane++) {
        if (free(p.longitude + offset, lane)) spot = { at: p.longitude + offset, lane };
      }
    }
    placed.push({ id: p.id, ...(spot ?? { at: p.longitude, lane: 0 }) });
  }
  return new Map(placed.map((x) => [x.id, { at: x.at, lane: x.lane }]));
}

export function Wheel({ title, points, cusps, asc, mc, aspects, linkFrom, selected, onSelect }: {
  title: string;
  points: readonly WheelPoint[];
  cusps?: readonly number[] | null;
  asc?: number | null;
  mc?: number | null;
  aspects?: readonly WheelAspect[];
  /** この天体から ASC へ点線を引く */
  linkFrom?: string | null;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const origin = asc ?? 0;
  const xy = (lon: number, r: number): [number, number] => {
    const t = ((180 + lon - origin) * Math.PI) / 180;
    return [C + r * Math.cos(t), C - r * Math.sin(t)];
  };
  const lanes = layoutLanes(points);
  const byId = new Map(points.map((p) => [p.id, p]));
  return (
    <svg class="chart" viewBox="0 0 400 400" role="img" aria-label={title}>
      <circle cx={C} cy={C} r={OUTER} class="ring" />
      <circle cx={C} cy={C} r={SIGN_INNER} class="ring" />
      <circle cx={C} cy={C} r={INNER} class="ring" />
      {SIGN_SHORT.map((label, i) => {
        const [x1, y1] = xy(i * 30, SIGN_INNER);
        const [x2, y2] = xy(i * 30, OUTER);
        const [tx, ty] = xy(i * 30 + 15, 176);
        return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} class="tick" /><text x={tx} y={ty} class="sign-label">{label}</text></g>;
      })}
      {cusps?.map((c, i) => {
        const [x1, y1] = xy(c, INNER);
        const [x2, y2] = xy(c, SIGN_INNER);
        const next = cusps[(i + 1) % 12]!;
        const mid = c + (((next - c) + 360) % 360) / 2;
        const [tx, ty] = xy(mid, INNER + 9);
        return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} class="cusp" /><text x={tx} y={ty} class="house-label">{i + 1}</text></g>;
      })}
      {aspects?.map((x) => {
        const a = byId.get(x.a);
        const b = byId.get(x.b);
        if (!a || !b) return null;
        const [x1, y1] = xy(a.longitude, INNER);
        const [x2, y2] = xy(b.longitude, INNER);
        return <line key={`${x.a}-${x.b}`} x1={x1} y1={y1} x2={x2} y2={y2} class={`aspect ${x.kind}`} />;
      })}
      {asc != null && (() => {
        const [x1, y1] = xy(origin, INNER - 20);
        const [x2, y2] = xy(origin, OUTER + 4);
        const [lx, ly] = xy(origin, 104);
        return <><line x1={x1} y1={y1} x2={x2} y2={y2} class="asc-line" /><text x={lx} y={ly - 10} class="asc-label">ASC</text></>;
      })()}
      {mc != null && (() => {
        const [x1, y1] = xy(mc, INNER);
        const [x2, y2] = xy(mc, OUTER + 4);
        const [lx, ly] = xy(mc + 4, 150);
        return <><line x1={x1} y1={y1} x2={x2} y2={y2} class="mc-line" /><text x={lx} y={ly} class="mc-label">MC</text></>;
      })()}
      {asc != null && linkFrom && lanes.has(linkFrom) && (() => {
        const l = lanes.get(linkFrom)!;
        const [x1, y1] = xy(l.at, LANES[l.lane]! - GLYPH_R);
        const [x2, y2] = xy(origin, SIGN_INNER - 2);
        return <line x1={x1} y1={y1} x2={x2} y2={y2} class="ruler-link" />;
      })()}
      {points.map((p) => {
        const l = lanes.get(p.id)!;
        const r = LANES[l.lane]!;
        const [x, y] = xy(l.at, r);
        const [mx, my] = xy(p.longitude, SIGN_INNER);
        const [nx, ny] = xy(l.at, r + GLYPH_R);
        return (
          <g key={p.id} class={`body${p.emphasized ? " is-ruler" : ""}${selected === p.id ? " is-selected" : ""}${p.derived ? " is-earth" : ""}`}
            role="button" tabIndex={0} aria-label={p.label} aria-pressed={selected === p.id}
            onClick={() => onSelect(p.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(p.id); } }}>
            <line x1={mx} y1={my} x2={nx} y2={ny} class="pointer" />
            <circle cx={x} cy={y} r={GLYPH_R} class="body-bg" />
            <text x={x} y={y} class="body-label">{p.glyph}</text>
          </g>
        );
      })}
    </svg>
  );
}
