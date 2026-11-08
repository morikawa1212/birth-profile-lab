// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState } from "preact/hooks";
import type { CalcResult } from "../engine/worker";
import type { BirthDraft, Confirmation } from "../time/resolve";
import { call, UserError } from "./client";
import { loadContent, type ContentMap } from "./content";
import { AboutScreen } from "./screens/About";
import { ConfirmScreen } from "./screens/Confirm";
import { DetailScreen } from "./screens/Detail";
import { InputScreen, type InputState } from "./screens/Input";
import { ResultsScreen } from "./screens/Results";
import { BUILD_VERSION, HP_URL, SOURCE_URL } from "./site";

export const todayLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const useHash = (): string => {
  const [hash, setHash] = useState(location.hash.slice(1));
  useEffect(() => {
    const on = () => setHash(location.hash.slice(1));
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return hash;
};

export function App() {
  const hash = useHash();
  const [stage, setStage] = useState<"input" | "confirm">("input");
  const [draft, setDraft] = useState<BirthDraft | null>(null);
  const [inputState, setInputState] = useState<InputState | null>(null);
  const [placeLabel, setPlaceLabel] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [content, setContent] = useState<ContentMap>(new Map());
  const main = useRef<HTMLElement>(null);
  useEffect(() => void loadContent().then(setContent), []);

  const [route, itemId] = hash.split("/");
  const view = route === "about" ? "about" : result ? (itemId ? "detail" : "results") : stage;
  const viewKey = `${view}:${hash}`;
  useEffect(() => {
    // 画面が切り替わったら見出しへ移動し、読み上げと位置を揃える
    scrollTo(0, 0);
    main.current?.querySelector<HTMLElement>("h1")?.focus();
  }, [viewKey]);

  const guarded = async (work: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await work();
    } catch (e) {
      setError(e instanceof UserError ? e.message : "処理を続けられませんでした。ページを読み込み直してください。");
    } finally {
      setBusy(false);
    }
  };
  const submitInput = (d: BirthDraft, label: string, state: InputState) => guarded(async () => {
    setInputState(state);
    const c = await call("confirm", d, todayLocal());
    setDraft(d);
    setPlaceLabel(label);
    setConfirmation(c);
    setStage("confirm");
  });
  const reconfirm = (d: BirthDraft) => guarded(async () => {
    setConfirmation(await call("confirm", d, todayLocal()));
    setDraft(d);
  });
  const runCalculation = (d: BirthDraft) => guarded(async () => {
    const r = await call("calculate", d, todayLocal());
    setDraft(d);
    setResult(r);
    if (location.hash !== "#overview") location.hash = "overview";
  });
  const restart = () => {
    setResult(null);
    setConfirmation(null);
    setStage("input");
    setError("");
    if (location.hash) history.replaceState(null, "", location.pathname);
    scrollTo(0, 0);
  };

  return (
    <div class="page">
      <header class="site-header">
        <a class="brand" href="#" onClick={(e) => { if (result) { e.preventDefault(); location.hash = "overview"; } }}>出生プロフィール</a>
        <a href={HP_URL} rel="noreferrer">森川尭史のHPへ</a>
      </header>
      <main ref={main} class="content">
        {error && <p class="alert" role="alert">{error}</p>}
        {view === "input" && <InputScreen initial={inputState} busy={busy} onSubmit={submitInput} />}
        {view === "confirm" && draft && confirmation && (
          <ConfirmScreen draft={draft} placeLabel={placeLabel} confirmation={confirmation} busy={busy} onBack={() => { setError(""); setStage("input"); }} onChange={reconfirm} onCalculate={runCalculation} />
        )}
        {view === "results" && result && <ResultsScreen result={result} tab={route || "overview"} {...(draft?.time ? { time: draft.time } : {})} placeLabel={placeLabel} content={content} onRestart={restart} />}
        {view === "detail" && result && <DetailScreen result={result} moduleId={route!} itemId={itemId!} content={content} />}
        {view === "about" && <AboutScreen hasResult={!!result} result={result} content={content} />}
      </main>
      <footer class="site-footer">
        <section class="support-box" aria-labelledby="site-support">
          <h2 id="site-support">このサイトを応援する</h2>
          <p>このサイトは無料で公開しています。役に立ったと感じたら、応援していただけるとうれしいです。OFUSE の登録なしで、金額を選んで送れます。</p>
          <a class="support-link" href="https://ofuse.me/o?uid=107888" target="_blank" rel="noopener noreferrer">応援する</a>
        </section>
        <aside class="more-contents" aria-label="ほかのコンテンツ">
          <p>ホメオパシー、フラワーエッセンス、ジェムエリクサー、易経など、ほかの無料コンテンツもあります。</p>
          <a href="https://morikawatakashi.com/contents/">コンテンツ一覧を見る →</a>
        </aside>
        <p>入力した生年月日・時刻・出生地は、この端末の中だけで計算します。送信も記録もしません。</p>
        <nav aria-label="サイトの情報">
          <a href="#about">このサイトについて</a>
          {SOURCE_URL ? <a href={SOURCE_URL} rel="noreferrer">ソースコード(AGPL)</a> : <span>ソースコード(公開準備中)</span>}
          <a href={HP_URL} rel="noreferrer">森川尭史のHP</a>
        </nav>
        <p class="version">版: {BUILD_VERSION}</p>
      </footer>
    </div>
  );
}
