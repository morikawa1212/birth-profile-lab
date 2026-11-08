// SPDX-License-Identifier: AGPL-3.0-or-later
// 秘教占星術の総合的な読み解き。配置の組み合わせに応じたルールで文を組み立てる。
// 原典に基づく説明(source)と、複数の配置を統合したこのサイトの考察(synthesis)を段落ごとに分ける。
// 魂やパーソナリティの光線、意識の段階、魂の年齢は判定しない。
import { BODY_LABELS, CROSS_LABELS, RAY_NAMES, RULER_LABELS, type EsotericBody, type RayNumber } from "../modules/esoteric/data";
import { ASPECT_LABEL, type EsotericData, type TriadPoint } from "../modules/esoteric/index";
import type { ContentMap } from "./content";

export type Basis = "source" | "synthesis";
export interface SynthesisParagraph { text: string; basis: Basis; refs: readonly string[] }
export interface SynthesisSection { heading: string; paragraphs: readonly SynthesisParagraph[] }

export const SYNTHESIS_HEADINGS = [
  "魂が発達させようとする資質",
  "現在のパーソナリティとの関係",
  "過去の条件づけと向き合うテーマ",
  "秘教的支配星が示す成長の方向性",
  "七光線の観点からの考察",
  "他者や集団への奉仕の可能性",
  "日常で意識するとよいこと",
] as const;

/** ハウスの領域(一般的な西洋占星術の読み方) */
const HOUSE_FIELD: Readonly<Record<number, string>> = {
  1: "自分自身の表し方", 2: "お金や持ちもの、価値観", 3: "学びや身近な人との対話", 4: "家庭や心の拠りどころ",
  5: "創造や自己表現", 6: "日々の仕事や暮らしの習慣", 7: "パートナーや一対一の関係", 8: "深い結びつきや分かち合うもの",
  9: "探求や理想、遠くへの広がり", 10: "社会での役割や仕事", 11: "仲間や集団、将来の展望", 12: "内面の世界や、目に見えないところでの働き",
};
/** 十字のテーマ。秘教占星学の説明の要約 */
const CROSS_THEME: Readonly<Record<TriadPoint["cross"], string>> = {
  mutable: "移り変わる状況の中で成長していく",
  fixed: "揺るがない意図をもって魂の方向に気づいていく",
  cardinal: "新しい始まりへ向かう",
};
/** 光線の働きを短く。このサイトの考察 */
const RAY_SHORT: Readonly<Record<RayNumber, string>> = {
  1: "目的をはっきりさせ、新しく始める力", 2: "包み込む理解と、本質を見る目", 3: "考えを形にし、状況に適応する知性",
  4: "葛藤の中から調和を生み出す力", 5: "正確に確かめ、理解の橋をかける知識", 6: "理想に向かうひたむきさと献身",
  7: "秩序とリズムを通して理想を形にする力",
};
const ELEMENT = ["火", "地", "風", "水"] as const;

type PhraseKey = "ascSoul" | "sunPersonality" | "moonPast" | "service";

export function buildSynthesis(d: EsotericData, content: ContentMap): SynthesisSection[] {
  const phrase = (sign: string, key: PhraseKey): { text: string; basis: Basis } | null => {
    const r = content.get(`eso.sign.${sign}`)?.phrases?.[key];
    return r?.text ? { text: r.text, basis: r.basis } : null;
  };
  const sign = (p: TriadPoint) => p.position.sign;
  const house = (h: number | undefined) => (h ? `第${h}ハウス` : "");
  const body = (b: EsotericBody) => BODY_LABELS[b];
  const rays = (list: readonly RayNumber[]) => list.map((r) => `第${r}光線`).join("・");
  const P = (text: string, basis: Basis, refs: readonly string[]): SynthesisParagraph => ({ text, basis, refs });

  const asc = d.points.asc;
  const sun = d.points.sun!;
  const moon = d.points.moon!;
  const sections: SynthesisParagraph[][] = SYNTHESIS_HEADINGS.map(() => []);
  const [soul, personality, past, ruler, ray, service, daily] = sections as [SynthesisParagraph[], SynthesisParagraph[], SynthesisParagraph[], SynthesisParagraph[], SynthesisParagraph[], SynthesisParagraph[], SynthesisParagraph[]];
  const ascRef = asc ? `ASC(${sign(asc)})` : "";
  const sunRef = `太陽(${sign(sun)}${sun.house ? `・第${sun.house}ハウス` : ""})`;
  const moonRef = `月(${sign(moon)}${moon.house ? `・第${moon.house}ハウス` : ""})`;

  // 1. 魂が発達させようとする資質
  if (asc) {
    soul.push(P(`ASCは${sign(asc)}にあります。秘教占星学では、ASCを、この人生で意図された生き方や魂の当面の目的を示すものとしています。`, "source", [ascRef]));
    const ph = phrase(asc.position.signId, "ascSoul");
    if (ph) soul.push(P(`${sign(asc)}のASCからは、「${ph.text}」が、魂が育てようとする資質として考えられます。`, ph.basis, [ascRef]));
    soul.push(P(`${sign(asc)}は${CROSS_LABELS[asc.cross]}の星座で、${CROSS_THEME[asc.cross]}というテーマと結びつけられています。ただし、十字は意識のあり方に関わるもので、この配置から段階を判断するものではありません。`, "source", [ascRef]));
    soul.push(P("ASCは最も重要な手がかりですが、これだけで魂の全体像が決まるわけではありません。太陽や月、支配星との関係とあわせて眺めてみてください。", "synthesis", [ascRef]));
  } else {
    soul.push(P("出生地がないため、ASCを推測せずに保留しています。魂の方向性は、ASCが分かると読み解けます。ここでは、太陽と月を中心に眺めてください。", "synthesis", []));
  }

  // 2. 現在のパーソナリティとの関係
  personality.push(P(`太陽は${sign(sun)}${sun.house ? `の第${sun.house}ハウス` : ""}にあります。秘教占星学では、太陽星座を、これまでに積み重ねてきたものの総まとめとして、パーソナリティを治めるものとしています。`, "source", [sunRef]));
  const sunPh = phrase(sun.position.signId, "sunPersonality");
  if (sunPh) personality.push(P(`${sign(sun)}の太陽からは、「${sunPh.text}」が、すでに培われてきた資質として考えられます。`, sunPh.basis, [sunRef]));
  const sunRuler = d.bodies[sun.rulers.orthodox];
  const sunRulerPos = sunRuler.placement.status === "not_calculated" ? "" : `${sunRuler.placement.position.sign}${sunRuler.placement.house ? `の第${sunRuler.placement.house}ハウス` : ""}にあります`;
  personality.push(P(`太陽星座の通常の支配星は${body(sun.rulers.orthodox)}(第${sunRuler.ray}光線)${sunRulerPos ? `で、${sunRulerPos}` : "です"}。`, "source", [sunRef, `${body(sun.rulers.orthodox)}`]));
  if (asc) {
    const diff = (sun.position.signIndex - asc.position.signIndex + 12) % 12;
    const shared = sun.signRays.filter((r) => asc.signRays.includes(r));
    let text: string;
    if (diff === 0) text = `ASCと太陽が同じ${sign(sun)}にあります。培われてきたパーソナリティと魂の方向が同じ星座で重なるため、すでにある資質を、より広い目的のために使い直していくことがテーマになると考えられます。`;
    else if (diff === 6) text = `ASCと太陽は向かい合う星座(${sign(asc)}と${sign(sun)})です。パーソナリティの資質と魂の方向が対極にあるため、両者の釣り合いをとりながら統合していくことがテーマになると考えられます。`;
    else if (asc.cross === sun.cross) text = `ASCと太陽は、どちらも${CROSS_LABELS[sun.cross]}の星座です。同じ十字の別の腕として、性質は異なりながらも、似たテーマを別の角度から扱っていると見ることができます。`;
    else if (diff % 4 === 0) text = `ASCと太陽は、同じ${ELEMENT[sun.position.signIndex % 4]}の星座どうしです。パーソナリティと魂の方向に自然に通い合う性質があり、無理なく統合へ向かいやすいと考えられます。`;
    else text = `ASCの${sign(asc)}と太陽の${sign(sun)}は、異なる性質の星座です。違いがあるからこそ、パーソナリティの資質を魂の方向に向けて使い直していく余地があると考えられます。`;
    personality.push(P(text, "synthesis", [ascRef, sunRef]));
    if (shared.length && diff !== 0) personality.push(P(`ASCの星座と太陽の星座には、ともに${rays(shared)}が関わっています。この光線が、パーソナリティと魂の方向をつなぐ共通の性質として働くと考えられます。`, "synthesis", [ascRef, sunRef]));
  }
  if (sun.house) personality.push(P(`太陽が第${sun.house}ハウスにあることから、${HOUSE_FIELD[sun.house]}の領域で、パーソナリティの資質が表れやすいと考えられます。`, "synthesis", [sunRef]));

  // 3. 過去の条件づけと向き合うテーマ
  past.push(P(`月は${sign(moon)}${moon.house ? `の第${moon.house}ハウス` : ""}にあります。秘教占星学では、月を、過ぎ去ったものを示し、限界や現在の足かせを表すものとしています。`, "source", [moonRef]));
  const moonPh = phrase(moon.position.signId, "moonPast");
  if (moonPh) past.push(P(`${sign(moon)}の月からは、「${moonPh.text}」が、習慣として出やすいと考えられます。`, moonPh.basis, [moonRef]));
  if (asc && moon.position.signId === asc.position.signId) past.push(P(`月とASCが同じ${sign(moon)}にあります。過去から持ち越した反応と、魂が育てようとする資質が同じ星座に表れるため、同じテーマが慣れた反応として出るときと、意識的な選択として出るときの違いに気づくことが助けになるでしょう。`, "synthesis", [moonRef, ascRef]));
  if (moon.position.signId === sun.position.signId) past.push(P(`月と太陽が同じ${sign(moon)}にあります。培われてきた資質と習慣的な反応が近いため、得意なことほど無意識の反応になりやすい点に目を向けることが助けになるでしょう。`, "synthesis", [moonRef, sunRef]));
  if (moon.house) past.push(P(`月が第${moon.house}ハウスにあることから、${HOUSE_FIELD[moon.house]}の場面で、慣れた反応が出やすいと考えられます。`, "synthesis", [moonRef]));
  past.push(P("これらは欠点ではなく、気づくことで選び直せる反応として受けとめることが助けになるでしょう。", "synthesis", [moonRef]));

  // 4. 秘教的支配星が示す成長の方向性
  if (asc) {
    const link = d.ascRulers.find((x) => x.scheme === "esoteric")!;
    const r = d.bodies[link.body];
    ruler.push(P(`${sign(asc)}の秘教的支配星は${body(r.body)}(第${r.ray}光線・${r.sacred ? "聖なる惑星" : "聖ならざる惑星"})です。秘教占星学では、ASCの星座を秘教的支配星とあわせて見ることで、魂の目的が示されるとしています。`, "source", [ascRef, `秘教的支配星(${body(r.body)})`]));
    const pl = r.placement;
    if (pl.status === "not_calculated") {
      ruler.push(P("ヴァルカンは位置を算出していないため、星座とハウスからの読み解きは行いません。ヴァルカンが伝える第1光線の性質を、テーマとして参考にしてください。", "source", [`${body(r.body)}`]));
    } else {
      const rRef = `${body(r.body)}(${pl.position.sign}${pl.house ? `・第${pl.house}ハウス` : ""})`;
      const derived = pl.status === "derived" ? "地球の位置は、太陽の反対側から導いた象徴的な位置です。" : "";
      ruler.push(P(`${derived}${body(r.body)}は${pl.position.sign}${pl.house ? `の第${pl.house}ハウス` : ""}にあります。`, "source", [rRef]));
      const ph = phrase(pl.position.signId, "ascSoul");
      if (ph) ruler.push(P(`支配星が${pl.position.sign}にあることから、${pl.position.sign}の「${ph.text}」という性質が、ASCの方向を育てる助けになると考えられます。`, "synthesis", [ascRef, rRef]));
      if (pl.house) ruler.push(P(`${HOUSE_FIELD[pl.house]}の領域が、魂の方向を育てる場の一つになると考えられます。`, "synthesis", [rRef]));
      const aspects = [...r.aspects].sort((a, b) => a.orb - b.orb).slice(0, 3);
      if (aspects.length) ruler.push(P(`${body(r.body)}は、${aspects.map((a) => `${BODY_LABELS[a.other as EsotericBody]}と${ASPECT_LABEL[a.aspect]}`).join("、")}の関係にあります。`, "source", [rRef]));
      if (link.toAsc?.aspect) ruler.push(P(`${body(r.body)}はASCと${ASPECT_LABEL[link.toAsc.aspect]}の関係にあり、支配星とASCが直接結びついています。魂の方向が、${body(r.body)}の働きを通して表に出やすいと考えられます。`, "synthesis", [rRef, ascRef]));
    }
    const orth = asc.rulers.orthodox;
    if (orth === link.body) {
      ruler.push(P(`通常の支配星も${body(orth)}です。同じ天体がパーソナリティの次元と魂の次元の両方で働くため、${body(orth)}の使い方そのものが、日常の行動と魂の方向をつなぐ鍵になると考えられます。`, "synthesis", [ascRef]));
    } else {
      ruler.push(P(`通常の支配星は${body(orth)}(第${d.bodies[orth].ray}光線)です。日常のパーソナリティは${body(orth)}の働きで動きやすい一方、魂の方向は${body(link.body)}の働きを通して育つ、という違いとして見ることができます。`, "synthesis", [ascRef]));
    }
    ruler.push(P(`ハイアラーキの支配星は${body(asc.rulers.hierarchical)}です。`, "source", [ascRef]));
    if ((asc.rulers.esoteric === "moon" || asc.rulers.hierarchical === "moon")) {
      const scheme = asc.rulers.esoteric === "moon" ? "esoteric" : "hierarchical";
      const note = asc.position.signId === "virgo"
        ? "秘教占星学の乙女座の章では、秘教的支配星の月をヴァルカンと並べて示し、第4光線の月が第1光線の働きを表すとされています(PDF p.127)。"
        : "秘教占星学では、水瓶座に関わる文脈で、月が天王星や海王星を覆うとされています(PDF p.68, 155)。";
      ruler.push(P(`ASCの${RULER_LABELS[scheme]}は月です。${note}ここでの月は、過去の条件づけとしての月とは別の文脈で扱われています。`, "source", [ascRef]));
    }
  } else {
    ruler.push(P("出生地がないため、ASCとその秘教的支配星は保留しています。", "synthesis", []));
  }

  // 5. 七光線の観点からの考察
  const paths: [string, readonly RayNumber[], string][] = [];
  if (asc) {
    paths.push(["ASCの星座を通じて", asc.signRays, ascRef]);
    paths.push(["ASCの秘教的支配星を通して", [d.bodies[asc.rulers.esoteric].ray], `秘教的支配星(${body(asc.rulers.esoteric)})`]);
  }
  paths.push(["太陽星座を通じて", sun.signRays, sunRef]);
  paths.push(["太陽の通常の支配星を通して", [sunRuler.ray], `${body(sun.rulers.orthodox)}`]);
  paths.push(["月星座を通じて", moon.signRays, moonRef]);
  ray.push(P(paths.map(([label, list]) => `${label}${rays(list)}`).join("、") + "が関わっています。", "source", paths.map((x) => x[2])));
  const count = new Map<RayNumber, number>();
  for (const [, list] of paths) for (const r of new Set(list)) count.set(r, (count.get(r) ?? 0) + 1);
  const max = Math.max(...count.values());
  const top = [...count].filter(([, n]) => n === max && n >= 2).map(([r]) => r).sort();
  if (top.length > 2) ray.push(P(`${rays(top)}が、それぞれ複数の経路で関わっています。特定の光線に偏るよりも、いくつかの光線の性質が幅広く組み合わさっていると見ることができます。`, "synthesis", paths.map((x) => x[2])));
  else if (top.length) ray.push(P(`${rays(top)}が、複数の経路で重ねて関わっています。${top.map((r) => `第${r}光線(${RAY_NAMES[r]})の${RAY_SHORT[r]}`).join("、")}が、チャートの中でくり返し示されるテーマと考えられます。`, "synthesis", paths.filter((x) => x[1].some((r) => top.includes(r))).map((x) => x[2])));
  if (asc && asc.signRays.includes(d.bodies[asc.rulers.esoteric].ray)) {
    const r = d.bodies[asc.rulers.esoteric].ray;
    ray.push(P(`ASCの星座を通る光線と、秘教的支配星の光線が、どちらも第${r}光線です。魂の方向について、同じ性質が二重に示されていると見ることができます。`, "synthesis", [ascRef]));
  }
  ray.push(P("これはチャートを通じて関係する光線です。本人の魂やパーソナリティの光線は、出生チャートだけでは決まらないため、ここでは判定していません。", "source", []));

  // 6. 他者や集団への奉仕の可能性
  const base = asc ?? sun;
  const servicePh = phrase(base.position.signId, "service");
  if (servicePh) service.push(P(`${asc ? "ASC" : "太陽"}の${sign(base)}から考えられる奉仕のかたちとして、「${servicePh.text}」が挙げられます。`, servicePh.basis, [asc ? ascRef : sunRef]));
  if (asc && sun.position.signId !== asc.position.signId) {
    const sp = phrase(sun.position.signId, "service");
    if (sp) service.push(P(`太陽の${sign(sun)}からは、「${sp.text}」も、パーソナリティの資質を生かした関わり方として考えられます。`, "synthesis", [sunRef]));
  }
  if (asc) {
    const pl = d.bodies[asc.rulers.esoteric].placement;
    if (pl.status !== "not_calculated" && pl.house) service.push(P(`秘教的支配星が第${pl.house}ハウスにあることから、${HOUSE_FIELD[pl.house]}の場が、他者との関わりを通して魂の方向を表す場になると考えられます。`, "synthesis", [`秘教的支配星(${body(asc.rulers.esoteric)})`]));
  }
  if (!service.length) service.push(P("奉仕の方向は、各星座の解説も参考にしてください。", "synthesis", []));

  // 7. 日常で意識するとよいこと
  daily.push(P(`${sign(moon)}の月らしい反応が出たときに、一呼吸おいて、それに気づいてみることが助けになるでしょう。`, "synthesis", [moonRef]));
  daily.push(P(`${sign(sun)}の太陽の資質を、自分のためだけでなく、周りの人のためにも使ってみることが助けになるでしょう。`, "synthesis", [sunRef]));
  if (asc) {
    const r = d.bodies[asc.rulers.esoteric];
    const where = r.placement.status !== "not_calculated" && r.placement.house ? `${HOUSE_FIELD[r.placement.house]}の場面で、` : "";
    daily.push(P(`${where}秘教的支配星の${body(r.body)}が伝える第${r.ray}光線の${RAY_SHORT[r.ray]}を、小さく試してみることが助けになるでしょう。`, "synthesis", [`秘教的支配星(${body(r.body)})`]));
    const q = content.get(`eso.sign.${asc.position.signId}`)?.questions?.[0];
    if (q) daily.push(P(`持ち歩く問い: ${q}`, "synthesis", [ascRef]));
  }

  return SYNTHESIS_HEADINGS.map((heading, i) => ({ heading, paragraphs: sections[i]! }));
}

export function synthesisText(sections: readonly SynthesisSection[]): string {
  return sections.map((s) => [`◇ ${s.heading}`, ...s.paragraphs.map((p) => `${p.text}${p.basis === "synthesis" ? "〔独自の考察〕" : "〔原典〕"}${p.refs.length ? `(根拠: ${p.refs.join("、")})` : ""}`)].join("\n")).join("\n\n");
}

