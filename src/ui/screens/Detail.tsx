// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CalcResult } from "../../engine/worker";
import type { ContentMap, ContentRecord } from "../content";
import { contentHeading, MODULE_LABELS } from "../labels";
import { DICTIONARY_URL, INQUIRY_URL, SESSION_URL } from "../site";
import { OfficialNote, SettingsTable } from "./Results";

// スフィア別のラインは解説がある場合だけ表示する
const OPTIONAL_KEY = /^gk\.sphere\.[a-z_]+\.line\.\d$/;

export function DetailScreen({ result, moduleId, itemId, content }: { result: CalcResult; moduleId: string; itemId: string; content: ContentMap }) {
  const m = result.modules[moduleId];
  const item = m?.items.find((i) => i.id === itemId);
  if (!m || !item) {
    return <section><h1 tabIndex={-1}>項目が見つかりません</h1><a href="#overview">概要へ戻る</a></section>;
  }
  return (
    <section>
      <p><a href={`#${moduleId}`}>{MODULE_LABELS[moduleId]}へ戻る</a></p>
      <h1 tabIndex={-1}>{item.label}</h1>
      <p class="result-value">{item.display}</p>
      {m.status === "provisional" && <p class="notice">おおよその時刻による仮計算です。</p>}
      {moduleId === "gene_keys" && <OfficialNote />}
      <div class="stack">
        {item.contentKeys.filter((key) => content.has(key) || !OPTIONAL_KEY.test(key)).map((key) => <ContentSection key={key} contentKey={key} record={content.get(key)} />)}
        <details class="card">
          <summary>計算条件</summary>
          <SettingsTable module={m} />
        </details>
        <section class="card">
          <h2>さらに深めるには</h2>
          <p>知ったことを現実の変化につなげたい方に、個別コーチングで伴走します。</p>
          <p><a href={SESSION_URL} rel="noreferrer">個別コーチングについて見る</a> ／ <a href={INQUIRY_URL} rel="noreferrer">お問い合わせ</a></p>
        </section>
      </div>
    </section>
  );
}

function ContentSection({ contentKey, record }: { contentKey: string; record: ContentRecord | undefined }) {
  const keyNumber = /^gk\.key\.(\d+)$/.exec(contentKey)?.[1];
  return (
    <section class="card" data-content-key={contentKey}>
      <h2>{record?.title ?? contentHeading(contentKey)}</h2>
      {record?.review === "draft" && <p class="draft-tag">確認中の下書き</p>}
      {record?.body ? paragraphs(record.body) : <p class="pending">解説準備中</p>}
      {record?.attributes?.length ? (
        <>
          <dl class="table">{record.attributes.map((a) => <><dt>{a.name}</dt><dd>{a.value}</dd></>)}</dl>
          <p class="note">出典: {[...new Set(record.attributes.map((a) => a.source))].join("、")}</p>
        </>
      ) : null}
      {record?.sections?.map((x) => (
        <>
          <h3>{x.heading}</h3>
          {paragraphs(x.body)}
        </>
      ))}
      {record?.questions?.length ? (
        <>
          <h3>観照の問い</h3>
          <ul>{record.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </>
      ) : null}
      {record?.sources.length ? (
        <>
          <h3>原典・書籍で読む</h3>
          <ul>{record.sources.map((s, i) => <li key={i}>{safeUrl(s.url) ? <a href={safeUrl(s.url)} rel="noreferrer">{s.title}</a> : s.title}{s.author ? ` ${s.author}` : ""}{s.page ? ` ${s.page}` : ""}</li>)}</ul>
        </>
      ) : null}
      {keyNumber && <p><a href={DICTIONARY_URL(Number(keyNumber))} rel="noreferrer">第{keyNumber}の鍵を64卦辞典で読む</a></p>}
    </section>
  );
}

const paragraphs = (text: string) => text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>);

function safeUrl(url: string | undefined): string | undefined {
  return url && /^https:\/\//.test(url) ? url : undefined;
}
