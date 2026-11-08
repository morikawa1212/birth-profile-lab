// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from "preact/hooks";
import type { ModuleResult, ResultItem } from "../../core/types";
import type { CalcResult } from "../../engine/worker";
import type { NumerologyData } from "../../modules/numerology/index";
import type { WesternData } from "../../modules/western/index";
import type { EsotericData } from "../../modules/esoteric/index";
import { EsotericChart, EsotericSynthesisCard, LearnLinks } from "./Esoteric";
import { GeneKeysChart, VedicChart, WesternChart } from "../charts/ModuleCharts";
import { Explanation, hasExplanation } from "../Explanation";
import type { ContentMap } from "../content";
import { allModulesText, itemSummary, singleModuleText, type BirthSummary } from "../copyText";
import { ageOn, buildContemplationPrompt, buildPrompt, buildSinglePrompt, PROMPT_ORDER, PROMPT_PATTERNS, type PromptContext } from "../prompts";
import { CopyButton } from "../CopyButton";
import { GROUP_LABELS, MISSING_LABELS, MODULE_LABELS, MODULE_ORDER, settingRows, SUMMARY_ITEMS } from "../labels";
import { DICTIONARY_SEARCH_URL, INQUIRY_URL, NOT_OFFICIAL, OFFICIAL_URL, SESSION_URL } from "../site";

export function OfficialNote() {
  return <p class="notice">{NOT_OFFICIAL}<a href={OFFICIAL_URL} rel="noreferrer">公式サイト(日本語)</a>をご覧ください。</p>;
}

export function ResultsScreen({ result, tab, time, placeLabel, content, onRestart }: { result: CalcResult; tab: string; time?: string; placeLabel: string; content: ContentMap; onRestart: () => void }) {
  const summary: BirthSummary = { birth: result.birth, placeLabel, ...(time ? { time } : {}) };
  const active = tab === "overview" || MODULE_ORDER.includes(tab as never) ? tab : "overview";
  const tabs = [["overview", "概要"], ...MODULE_ORDER.map((m) => [m, MODULE_LABELS[m]!])] as const;
  const [brief, setBrief] = useState(false);
  const textOptions = brief ? { compact: true, brief: true } : { compact: true };
  const overviewBody = () => allModulesText(result.modules, summary, content, { ...textOptions, summaryOnly: true });
  const moduleBody = (id: string) => singleModuleText(result.modules[id]!, summary, content, textOptions);
  /** 詳しいプロンプトの長さ。全体の画面では総合的な鑑定、体系の画面ではその体系のもの */
  const promptLength = () => active === "overview"
    ? buildPrompt("overall", allModulesText(result.modules, summary, content, { compact: true }), promptContext(result.birth.isoDate)).length
    : active === "gene_keys" ? buildContemplationPrompt(moduleBody("gene_keys")).length : buildSinglePrompt(active, moduleBody(active)).length;
  return (
    <section>
      <h1 tabIndex={-1}>{active === "overview" ? "計算結果の概要" : MODULE_LABELS[active]}</h1>
      <nav class="tabs" aria-label="体系の切り替え">
        {tabs.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? "page" : undefined}>{label}</a>)}
      </nav>
      {result.birth.notes.map((n) => <p key={n} class="notice">{n}</p>)}
      {(active === "overview" || result.modules[active]!.status !== "unavailable") && (
        <div class="copy-row">
          {active === "overview"
            ? <CopyButton primary label="すべての分析結果をコピー" text={() => allModulesText(result.modules, summary, content)} />
            : <CopyButton primary label={`${MODULE_LABELS[active]}の分析結果をコピー`} text={() => singleModuleText(result.modules[active]!, summary, content)} />}
          <p class="note copy-note">コピーしてAIでの分析などでご活用ください。コピーには生年月日、時刻、出生地と解説の本文が含まれます。貼り付けた内容は、貼り付け先のサービスへ送られます。</p>
          <section class="prompt-box" aria-labelledby="prompt-title">
            <h2 id="prompt-title">{active === "gene_keys" ? "AI観照サポート用プロンプト生成" : "AI鑑定用プロンプト生成"}</h2>
            <p class="note">{active === "gene_keys"
              ? "遺伝子易経は、内容を知ったうえで、日常の中で観照していくことを大切にします。AIが質問をしながら観照に寄り添うプロンプトを、鑑定内容とあわせてコピーします。"
              : "知りたいことを選ぶと、AIへの指示と鑑定内容をまとめてコピーします。AIに貼り付けてお使いください。"}</p>
            <fieldset class="prompt-length">
              <legend>プロンプトの長さ</legend>
              <label><input type="radio" name="prompt-length" checked={!brief} onChange={() => setBrief(false)} />詳しく(解説つき)</label>
              <label><input type="radio" name="prompt-length" checked={brief} onChange={() => setBrief(true)} />短く(主要な項目のみ)</label>
            </fieldset>
            <p class="note prompt-length-note">{brief
              ? "主要な項目の値と短い指示だけをコピーします。無料版のAIやスマホでも使いやすい長さです。解説の本文は含まないため、読み解きはAIの一般的な知識によります。"
              : longNote(promptLength())}</p>
            <div class="prompt-buttons">
              {active === "overview"
                ? <>
                    {PROMPT_ORDER.map((id) => <PromptButton key={id} label={PROMPT_PATTERNS[id].label} text={() => buildPrompt(id, overviewBody(), promptContext(result.birth.isoDate), brief)} />)}
                    {result.modules.gene_keys!.status !== "unavailable" && <PromptButton label="遺伝子易経の観照サポート" text={() => buildContemplationPrompt(moduleBody("gene_keys"))} />}
                  </>
                : active === "gene_keys"
                  ? <PromptButton label="観照をサポートするプロンプト" text={() => buildContemplationPrompt(moduleBody("gene_keys"))} />
                  : <PromptButton label={`${MODULE_LABELS[active]}の鑑定`} text={() => buildSinglePrompt(active, moduleBody(active), brief)} />}
            </div>
          </section>
        </div>
      )}
      {active === "overview"
        ? <Overview result={result} summary={summary} content={content} />
        : <ModuleView module={result.modules[active]!} content={content} />}
      <SessionInvite />
      <div class="actions"><button type="button" class="btn secondary" onClick={onRestart}>入力をやり直す</button></div>
    </section>
  );
}

/** 遺伝子易経の11の配置を辞典で開く。コアと天職は同じ配置なので1つにまとめる */
function DictionaryLink({ module: m }: { module: ModuleResult }) {
  const values = m.items.filter((i) => i.id !== "core").map((i) => i.display);
  return <a class="btn secondary dictionary-link" href={DICTIONARY_SEARCH_URL(values)} target="_blank" rel="noopener noreferrer">解説辞典で詳しく見る<span class="sr-note">(新しいタブで開きます)</span></a>;
}

function SessionInvite() {
  return (
    <section class="session-invite" aria-labelledby="session-invite-title">
      <h2 id="session-invite-title">知ったことを、現実の変化につなげるために</h2>
      <p>自分の傾向や才能がわかっても、「では、明日から何をすればいいのか」で立ち止まることがあります。</p>
      <p>AIとのやり取りは手軽で便利です。</p>
      <p>ただ、自分の言葉で問いかけ続けるうちに、見たい答えに寄っていったり、耳の痛い点を避けたりと、どうしても偏りが生まれることがあります。</p>
      <p>個別コーチングでは、あなたの傾向、個性、才能を踏まえて、いま向き合っている仕事や人間関係の具体的な場面を対話で整理します。</p>
      <p>才能を活かせていないと感じる仕事のどの場面を変えるのか。<br />言いにくい相手にどう伝えるのか。</p>
      <p>次に試すことを一緒に決め、やってみて、その結果を振り返ります。</p>
      <p>伴走を受けながら、知っていることを少しずつ現実の変化に変えていきます。</p>
      <div class="actions">
        <a class="btn primary" href={SESSION_URL} rel="noreferrer">個別コーチングについて見る</a>
        <a class="btn secondary" href={INQUIRY_URL} rel="noreferrer">お問い合わせ</a>
      </div>
      <p class="note">どのプランが合うか迷う場合や、内容についてのご質問は、お問い合わせからお気軽にどうぞ。</p>
    </section>
  );
}

/** 長いプロンプトでは、長文を丁寧に読めるAIをすすめる。製品名は時期で変わるため書かない */
function longNote(length: number): string {
  const size = length >= 10000 ? `約${(length / 10000).toFixed(1)}万字` : `約${Math.max(1, Math.round(length / 1000))}千字`;
  // 1万字未満は多くのAIで十分に扱える長さなので、長さだけを伝える
  return length >= 10000
    ? `このプロンプトは${size}と長めです。長い文章を丁寧に読めるAI(各サービスの上位モデルや、じっくり考えるモード)を使うと、読み落としが少なく、根拠に沿った分析になりやすくなります。途中が省かれる場合は「短く」をお試しください。`
    : `このプロンプトは${size}です。解説の本文もあわせてAIに渡します。`;
}

function promptContext(birthIso: string): PromptContext {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { year: now.getFullYear(), age: ageOn(birthIso, today) };
}

function PromptButton({ label, text }: { label: string; text: () => string }) {
  return <CopyButton label={label} doneMessage="プロンプトと鑑定内容をコピーしました。AIに貼り付けてください。" text={text} />;
}

function Unavailable({ module }: { module: ModuleResult }) {
  return <p class="notice">この体系の計算には{(module.missing ?? []).map((m) => MISSING_LABELS[m]).join("、")}が必要です。</p>;
}

function ItemRow({ moduleId, item, content, expandable = false }: { moduleId: string; item: ResultItem; content: ContentMap; expandable?: boolean }) {
  const summary = itemSummary(moduleId, item, content);
  return (
    <li>
      <a class="item" href={`#${moduleId}/${item.id}`}><span>{item.label}</span> <strong>{item.display}</strong>{summary && <small class="summary"> {summary}</small>}</a>
      {expandable && hasExplanation(item.contentKeys, content) && (
        <details class="item-more">
          <summary>解説を開く</summary>
          <Explanation keys={item.contentKeys} content={content} />
        </details>
      )}
    </li>
  );
}

function Overview({ result, summary, content }: { result: CalcResult; summary: BirthSummary; content: ContentMap }) {
  return (
    <div class="stack">
      <p class="note">各体系の主要な項目です。項目を選ぶと詳しい内容を確認できます。体系どうしを組み合わせた鑑定は行いません。</p>
      {MODULE_ORDER.map((id) => {
        const m = result.modules[id]!;
        const items = SUMMARY_ITEMS[id]!.map((x) => m.items.find((i) => i.id === x)).filter((x): x is ResultItem => !!x);
        return (
          <section key={id} class="card">
            <h2><a href={`#${id}`}>{MODULE_LABELS[id]}</a></h2>
            {m.status === "unavailable" ? <Unavailable module={m} /> : (
              <>
                <ul class="items">{items.map((i) => <ItemRow key={i.id} moduleId={id} item={i} content={content} />)}</ul>
                {id === "gene_keys" && <div class="copy-row card-copy"><DictionaryLink module={m} /></div>}
                <div class="copy-row card-copy"><CopyButton label={`${MODULE_LABELS[id]}の分析結果をコピー`} text={() => singleModuleText(m, summary, content)} /></div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ModuleView({ module: m, content }: { module: ModuleResult; content: ContentMap }) {
  const groups = new Map<string, ResultItem[]>();
  for (const i of m.items) groups.set(i.group ?? "", [...(groups.get(i.group ?? "") ?? []), i]);
  const aspects = groups.get("aspects");
  groups.delete("aspects");
  return (
    <div class="stack">
      {m.moduleId === "gene_keys" && <OfficialNote />}
      {m.status === "unavailable" && <Unavailable module={m} />}
      {m.moduleId === "gene_keys" && m.status !== "unavailable" && <div><DictionaryLink module={m} /></div>}
      {m.moduleId === "western" && m.data ? <HouseNote data={m.data as WesternData} /> : null}
      {m.moduleId === "western" && m.data ? <WesternChart module={m} content={content} /> : null}
      {m.moduleId === "gene_keys" && m.data ? <GeneKeysChart module={m} content={content} /> : null}
      {m.moduleId === "esoteric" && <p class="note">アリス・A・ベイリーの『秘教占星学』に基づき、西洋占星術と同じ天体の位置に、秘教的支配星と七光線を重ねています。西洋占星術のタブと見比べてみてください。</p>}
      {m.moduleId === "esoteric" && m.data ? <EsotericChart data={m.data as EsotericData} content={content} /> : null}
      {m.moduleId === "vedic" && m.data && !m.items.some((i) => i.id === "lagna") ? <p class="notice">出生地がないため、ラグナと室は保留しています。</p> : null}
      {m.moduleId === "vedic" && m.data ? <VedicChart module={m} content={content} /> : null}
      {[...groups].map(([g, items]) => (
        <section key={g} class="card">
          <h2>{GROUP_LABELS[g] ?? g}</h2>
          <ul class="items">{items.map((i) => <ItemRow key={i.id} moduleId={m.moduleId} item={i} content={content} expandable />)}</ul>
        </section>
      ))}
      {m.moduleId === "esoteric" && m.data ? <EsotericSynthesisCard data={m.data as EsotericData} content={content} /> : null}
      {m.moduleId === "esoteric" ? <LearnLinks content={content} /> : null}
      {m.moduleId === "numerology" && m.data ? <NumerologyTrace data={m.data as NumerologyData} /> : null}
      {aspects && (
        <details class="card">
          <summary>アスペクト({aspects.length}件)</summary>
          <ul class="items">{aspects.map((i) => <ItemRow key={i.id} moduleId={m.moduleId} item={i} content={content} />)}</ul>
        </details>
      )}
      {m.status !== "unavailable" && (
        <details class="card">
          <summary>採用している計算方法</summary>
          <SettingsTable module={m} />
        </details>
      )}
    </div>
  );
}

export function SettingsTable({ module: m }: { module: ModuleResult }) {
  return (
    <dl class="table">
      {settingRows(m.settings).map(([k, v]) => <><dt>{k}</dt><dd>{v}</dd></>)}
      <dt>計算エンジン</dt><dd>{m.provenance.engine} {m.provenance.engineVersion}</dd>
    </dl>
  );
}

function HouseNote({ data }: { data: WesternData }) {
  if (data.houses.status === "unsupported") return <p class="notice">{data.houses.reason}</p>;
  if (data.houses.status === "unavailable") return <p class="notice">出生地がないため、ハウス、ASC、MCは保留しています。</p>;
  return null;
}

function NumerologyTrace({ data }: { data: NumerologyData }) {
  const t = (x: readonly number[]) => x.join(" → ");
  return (
    <section class="card">
      <h2>計算の過程</h2>
      <dl class="table">
        <dt>ライフパス</dt><dd>{data.digits.join(" + ")} = {t(data.sumTrace)}</dd>
        <dt>誕生数</dt><dd>{t(data.birthdayTrace)}</dd>
      </dl>
    </section>
  );
}
