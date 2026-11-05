// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from "preact/hooks";
import type { BirthDraft, Confirmation, ConfirmedTime } from "../../time/resolve";

const offsetText = (t: ConfirmedTime) => `UTC${t.offset}${t.isDst ? "(夏時間)" : ""}`;

export function ConfirmScreen({ draft, placeLabel, confirmation: c, busy, onBack, onChange, onCalculate }: {
  draft: BirthDraft; placeLabel: string; confirmation: Confirmation; busy: boolean;
  onBack: () => void; onChange: (d: BirthDraft) => void; onCalculate: (d: BirthDraft) => void;
}) {
  const [offset, setOffset] = useState(draft.utcOffsetOverride ?? "");
  const blocked = c.status === "ambiguous" || c.status === "nonexistent";
  const clearOverride = (): BirthDraft => {
    const { utcOffsetOverride: _drop, ...rest } = draft;
    return rest;
  };
  return (
    <section>
      <h1 tabIndex={-1}>計算の条件を確認する</h1>
      <dl class="table">
        <dt>生年月日</dt><dd>{draft.date}</dd>
        <dt>出生時刻</dt><dd>{draft.time ?? "不明"}{draft.timeAccuracy === "approximate" ? "(おおよそ)" : ""}</dd>
        <dt>出生地</dt><dd>{placeLabel || "指定なし"}</dd>
        {draft.place && <><dt>緯度・経度</dt><dd>{draft.place.lat}, {draft.place.lon}</dd></>}
        {draft.timezone && draft.time && <><dt>タイムゾーン</dt><dd>{draft.timezone}</dd></>}
        {c.status === "ok" && <>
          <dt>UTC差</dt><dd>{offsetText(c.time)}{c.overridden ? "(入力された値)" : ""}</dd>
          <dt>世界時</dt><dd>{c.time.utcText}</dd>
        </>}
      </dl>
      {c.status === "nonexistent" && <p class="alert" role="alert">{c.message}</p>}
      {c.status === "ambiguous" && (
        <div class="panel" role="group" aria-label="重複する時刻の選択">
          <p>{c.message}</p>
          <div class="actions">
            {c.choices.map((t, i) => (
              <button key={i} type="button" class="btn secondary" disabled={busy} onClick={() => onChange({ ...draft, fold: i as 0 | 1 })}>
                {i === 0 ? "切り替え前" : "切り替え後"}: {offsetText(t)}
              </button>
            ))}
          </div>
        </div>
      )}
      {c.status === "ok" && c.message && <p class="notice">{c.message}</p>}
      {draft.time && (
        <details class="panel" open={c.status === "ok" && c.review}>
          <summary>UTC差を修正する</summary>
          <p class="note">戸籍や当時の資料で UTC差がわかる場合に入力します。通常は不要です。</p>
          <label for="offset">UTC差(例: +09:00)</label>
          <input id="offset" value={offset} onInput={(e) => setOffset(e.currentTarget.value)} />
          <div class="actions">
            <button type="button" class="btn secondary" disabled={busy || !offset.trim()} onClick={() => onChange({ ...draft, utcOffsetOverride: offset.trim() })}>この値を使う</button>
            {draft.utcOffsetOverride && <button type="button" class="btn secondary" onClick={() => { setOffset(""); onChange(clearOverride()); }}>修正を取り消す</button>}
          </div>
        </details>
      )}
      <div class="actions">
        <button type="button" class="btn primary" disabled={busy || blocked} onClick={() => onCalculate(draft)}>{busy ? "計算しています" : "この条件で計算する"}</button>
        <button type="button" class="btn secondary" onClick={onBack}>入力へ戻る</button>
      </div>
    </section>
  );
}
