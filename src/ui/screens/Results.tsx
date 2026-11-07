// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ModuleResult, ResultItem } from "../../core/types";
import type { CalcResult } from "../../engine/worker";
import type { NumerologyData } from "../../modules/numerology/index";
import type { WesternData } from "../../modules/western/index";
import type { ContentMap } from "../content";
import { allModulesText, singleModuleText, type BirthSummary } from "../copyText";
import { ageOn, buildPrompt, PROMPT_ORDER, PROMPT_PATTERNS, type PromptContext, type PromptId } from "../prompts";
import { CopyButton } from "../CopyButton";
import { GROUP_LABELS, MISSING_LABELS, MODULE_LABELS, MODULE_ORDER, settingRows, SUMMARY_ITEMS } from "../labels";
import { INQUIRY_URL, NOT_OFFICIAL, OFFICIAL_URL, SESSION_URL } from "../site";

export function OfficialNote() {
  return <p class="notice">{NOT_OFFICIAL}<a href={OFFICIAL_URL} rel="noreferrer">公式サイト</a>をご覧ください。</p>;
}

export function ResultsScreen({ result, tab, time, placeLabel, content, onRestart }: { result: CalcResult; tab: string; time?: string; placeLabel: string; content: ContentMap; onRestart: () => void }) {
  const summary: BirthSummary = { birth: result.birth, placeLabel, ...(time ? { time } : {}) };
  const active = tab === "overview" || MODULE_ORDER.includes(tab as never) ? tab : "overview";
  const tabs = [["overview", "概要"], ...MODULE_ORDER.map((m) => [m, MODULE_LABELS[m]!])] as const;
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
            <h2 id="prompt-title">AI鑑定用プロンプト生成</h2>
            <p class="note">知りたいことを選ぶと、AIへの指示と鑑定内容をまとめてコピーします。AIに貼り付けてお使いください。</p>
            <div class="prompt-buttons">
              {active === "overview"
                ? PROMPT_ORDER.map((id) => <PromptButton key={id} id={id} label={PROMPT_PATTERNS[id].label} body={() => allModulesText(result.modules, summary, content)} birth={result.birth.isoDate} />)
                : <PromptButton id="each" label={`${MODULE_LABELS[active]}の鑑定`} body={() => singleModuleText(result.modules[active]!, summary, content)} birth={result.birth.isoDate} />}
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

function promptContext(birthIso: string): PromptContext {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { year: now.getFullYear(), age: ageOn(birthIso, today) };
}

function PromptButton({ id, label, body, birth }: { id: PromptId; label: string; body: () => string; birth: string }) {
  return <CopyButton label={label} doneMessage="プロンプトと鑑定内容をコピーしました。AIに貼り付けてください。" text={() => buildPrompt(id, body(), promptContext(birth))} />;
}

function Unavailable({ module }: { module: ModuleResult }) {
  return <p class="notice">この体系の計算には{(module.missing ?? []).map((m) => MISSING_LABELS[m]).join("、")}が必要です。</p>;
}

function ItemRow({ moduleId, item, content }: { moduleId: string; item: ResultItem; content: ContentMap }) {
  const summary = item.contentKeys.map((k) => content.get(k)?.summary).find(Boolean);
  return (
    <li><a class="item" href={`#${moduleId}/${item.id}`}><span>{item.label}</span> <strong>{item.display}</strong>{summary && <small class="summary"> {summary}</small>}</a></li>
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
      {m.moduleId === "western" && m.data ? <HouseNote data={m.data as WesternData} /> : null}
      {m.moduleId === "vedic" && m.data && !m.items.some((i) => i.id === "lagna") ? <p class="notice">出生地がないため、ラグナと室は保留しています。</p> : null}
      {[...groups].map(([g, items]) => (
        <section key={g} class="card">
          <h2>{GROUP_LABELS[g] ?? g}</h2>
          <ul class="items">{items.map((i) => <ItemRow key={i.id} moduleId={m.moduleId} item={i} content={content} />)}</ul>
        </section>
      ))}
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
