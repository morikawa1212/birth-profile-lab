// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState } from "preact/hooks";
import type { TimeAccuracy } from "../../core/types";
import { japanExtraIndex, japanIndex, worldIndex } from "../../places/loader";
import { searchPlaces, type PlaceCandidate } from "../../places/search";
import type { BirthDraft } from "../../time/resolve";
import { call, UserError } from "../client";
import { clearSaved, readSaved, writeSaved } from "../storage";

type PlaceMode = "japan" | "world" | "manual" | "unknown";
export interface InputState {
  year: string; month: string; day: string; accuracy: TimeAccuracy; time: string; mode: PlaceMode; place: PlaceCandidate | null; zone: string;
}
const EMPTY: InputState = { year: "", month: "", day: "", accuracy: "exact", time: "", mode: "japan", place: null, zone: "Asia/Tokyo" };
const toHalf = (s: string) => s.normalize("NFKC").trim();

export function fromSaved(d: BirthDraft, label: string): InputState {
  const [year = "", month = "", day = ""] = d.date.split("-");
  return {
    year, month: String(Number(month)), day: String(Number(day)),
    accuracy: d.timeAccuracy ?? "exact", time: d.time ?? "",
    mode: d.place ? "japan" : d.timezone ? "unknown" : "japan",
    place: d.place && d.timezone ? { label, lat: d.place.lat, lon: d.place.lon, timezone: d.timezone } : null,
    zone: d.timezone ?? "Asia/Tokyo",
  };
}

export function InputScreen({ initial, busy, onSubmit }: { initial: InputState | null; busy: boolean; onSubmit: (d: BirthDraft, label: string, s: InputState) => void }) {
  // 保存した入力があれば最初から入れておく。チェックを外すと保存を消す
  const [saved] = useState(readSaved);
  const [s, setS] = useState<InputState>(initial ?? (saved ? fromSaved(saved.draft, saved.placeLabel) : EMPTY));
  const [save, setSave] = useState(!!saved);
  const [message, setMessage] = useState("");
  const set = (patch: Partial<InputState>) => setS((v) => ({ ...v, ...patch }));
  const needsTime = s.accuracy !== "unknown";

  const submit = (e: Event) => {
    e.preventDefault();
    setMessage("");
    const y = toHalf(s.year);
    if (!/^\d{4}$/.test(y) || !s.month || !s.day) return setMessage("生年月日を入力してください。年は西暦4桁です。");
    const draft: BirthDraft = { date: `${y}-${s.month.padStart(2, "0")}-${s.day.padStart(2, "0")}`, timeAccuracy: s.accuracy };
    let label = "";
    if (needsTime) {
      if (!s.time) return setMessage("出生時刻を入力してください。わからない場合は「不明」を選んでください。");
      draft.time = s.time;
    }
    if (s.mode === "unknown") {
      if (needsTime) draft.timezone = s.zone;
      label = "出生地なし";
    } else if (s.place) {
      draft.place = { lat: s.place.lat, lon: s.place.lon };
      draft.timezone = s.place.timezone;
      label = s.place.label;
    } else if (needsTime) {
      return setMessage("出生地を候補から選んでください。わからない場合は「わからない」を選んでください。");
    }
    if (save && !writeSaved({ draft, placeLabel: label })) setSave(false);
    onSubmit(draft, label, s);
  };

  return (
    <form onSubmit={submit} noValidate autoComplete="off">
      <h1 tabIndex={-1}>出生情報を入力する</h1>
      <p class="lead">遺伝子易経、西洋占星術、インド占星術、数秘術の計算結果を、一度の入力で確認できます。</p>
      <fieldset>
        <legend>生年月日</legend>
        <div class="date-row">
          <div><label for="year">年(西暦)</label><input id="year" inputMode="numeric" maxLength={4} placeholder="1980" value={s.year} onInput={(e) => set({ year: e.currentTarget.value })} /></div>
          <div><label for="month">月</label><select id="month" value={s.month} onChange={(e) => set({ month: e.currentTarget.value })}><option value="">-</option>{Array.from({ length: 12 }, (_, i) => <option value={i + 1}>{i + 1}</option>)}</select></div>
          <div><label for="day">日</label><select id="day" value={s.day} onChange={(e) => set({ day: e.currentTarget.value })}><option value="">-</option>{Array.from({ length: 31 }, (_, i) => <option value={i + 1}>{i + 1}</option>)}</select></div>
        </div>
      </fieldset>
      <fieldset>
        <legend>出生時刻</legend>
        <div class="radios">
          {([["exact", "正確にわかる"], ["approximate", "おおよそわかる"], ["unknown", "不明"]] as const).map(([v, t]) => (
            <label key={v}><input type="radio" name="accuracy" checked={s.accuracy === v} onChange={() => set({ accuracy: v })} />{t}</label>
          ))}
        </div>
        {needsTime ? (
          <div><label for="time">時刻</label><input id="time" type="time" value={s.time} onInput={(e) => set({ time: e.currentTarget.value })} /></div>
        ) : <p class="note">時刻が不明の場合、計算できるのは数秘術のみです。正午などを仮に入れることはしません。</p>}
      </fieldset>
      {needsTime && <PlacePicker state={s} set={set} />}
      <fieldset>
        <legend>入力情報の保存</legend>
        <label class="check"><input type="checkbox" checked={save} onChange={(e) => { const on = e.currentTarget.checked; setSave(on); if (!on) clearSaved(); }} />入力情報をこの端末に保存する</label>
        <p class="note">次回から入力を省けます。保存先はこの端末の中だけで、チェックを外すと消えます。共用の端末では使わないでください。</p>
      </fieldset>
      {message && <p class="alert" role="alert">{message}</p>}
      <div class="actions"><button class="btn primary" disabled={busy}>確認へ進む</button></div>
    </form>
  );
}

function PlacePicker({ state: s, set }: { state: InputState; set: (p: Partial<InputState>) => void }) {
  const modes: [PlaceMode, string][] = [["japan", "日本"], ["world", "海外"], ["manual", "緯度・経度で入力"], ["unknown", "わからない"]];
  return (
    <fieldset>
      <legend>出生地</legend>
      <div class="radios">
        {modes.map(([m, t]) => <label key={m}><input type="radio" name="place-mode" checked={s.mode === m} onChange={() => set({ mode: m, place: null })} />{t}</label>)}
      </div>
      {(s.mode === "japan" || s.mode === "world") && (s.place
        ? <div class="selected"><span>選択中: <strong>{s.place.label}</strong>{s.place.note ? `(${s.place.note})` : ""}</span><button type="button" class="link" onClick={() => set({ place: null })}>変更する</button></div>
        : <PlaceSearch key={s.mode} mode={s.mode} onPick={(place) => set({ place })} />)}
      {s.mode === "manual" && <ManualPlace place={s.place} onPick={(place) => set({ place })} />}
      {s.mode === "unknown" && (
        <>
          <p class="note">出生地が不明の場合、ハウス、ASC、MC、ラグナは保留します。計算に使うタイムゾーンを選んでください。</p>
          <ZoneSelect value={s.zone} onChange={(zone) => set({ zone })} />
        </>
      )}
    </fieldset>
  );
}

function PlaceSearch({ mode, onPick }: { mode: "japan" | "world"; onPick: (p: PlaceCandidate) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PlaceCandidate[]>([]);
  const [extra, setExtra] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "failed">("loading");
  const token = useRef(0);
  useEffect(() => {
    const mine = ++token.current;
    (async () => {
      try {
        const index = await (mode === "world" ? worldIndex() : extra ? japanExtraIndex() : japanIndex());
        if (mine !== token.current) return;
        setState("idle");
        setHits(searchPlaces(index, q));
      } catch {
        if (mine === token.current) setState("failed");
      }
    })();
  }, [q, extra, mode]);
  return (
    <div class="search">
      <label for="place-search">{mode === "japan" ? "市区町村名(かなでも検索できます)" : "都市名(日本語または英語)"}</label>
      <input id="place-search" type="search" autoComplete="off" autoCorrect="off" spellcheck={false} value={q} onInput={(e) => setQ(e.currentTarget.value)} placeholder={mode === "japan" ? "世田谷" : "ニューヨーク"} />
      {state === "loading" && <p class="note" role="status">地名データを読み込んでいます。{mode === "world" ? "海外の都市は約1.5MBあります。" : ""}</p>}
      {state === "failed" && <p class="alert" role="alert">地名データを読み込めませんでした。緯度・経度での入力もできます。</p>}
      {hits.length > 0 && (
        <ul class="candidates" aria-label="候補">
          {hits.map((h) => (
            <li key={`${h.label}${h.lat}${h.lon}`}><button type="button" onClick={() => onPick(h)}>{h.label}{h.note ? <small>{h.note}</small> : null}</button></li>
          ))}
        </ul>
      )}
      {q.trim() && state === "idle" && hits.length === 0 && <p class="note" role="status">候補が見つかりません。</p>}
      {mode === "japan" && q.trim() && (
        <div class="note">
          <p>合併で今はない市町村の場合は、合併後の現在の市町村を選んでください。計算への影響はわずかです。</p>
          <label class="check"><input type="checkbox" checked={extra} onChange={(e) => setExtra(e.currentTarget.checked)} />旧地名・地区名から探す(約0.5MB)</label>
        </div>
      )}
    </div>
  );
}

function ZoneSelect({ value, onChange }: { value: string; onChange: (z: string) => void }) {
  const [zones, setZones] = useState<string[]>([value]);
  useEffect(() => void call("zones").then(setZones).catch(() => undefined), []);
  return (
    <div>
      <label for="zone">タイムゾーン</label>
      <select id="zone" value={value} onChange={(e) => onChange(e.currentTarget.value)}>{zones.map((z) => <option key={z}>{z}</option>)}</select>
    </div>
  );
}

function ManualPlace({ place, onPick }: { place: PlaceCandidate | null; onPick: (p: PlaceCandidate) => void }) {
  const [lat, setLat] = useState(place ? String(place.lat) : "");
  const [lon, setLon] = useState(place ? String(place.lon) : "");
  const [zone, setZone] = useState(place?.timezone ?? "Asia/Tokyo");
  const [message, setMessage] = useState("");
  const apply = async () => {
    setMessage("");
    try {
      if (!lat.trim() || !lon.trim()) throw new UserError("緯度と経度を入力してください。");
      const p = await call("manualPlace", Number(toHalf(lat)), Number(toHalf(lon)), zone);
      onPick(p);
      setMessage("この地点を使います。");
    } catch (e) {
      setMessage(e instanceof UserError ? e.message : "地点を確認できませんでした。");
    }
  };
  return (
    <div class="manual">
      <div class="date-row">
        <div><label for="lat">緯度(北が正)</label><input id="lat" inputMode="decimal" value={lat} onInput={(e) => setLat(e.currentTarget.value)} /></div>
        <div><label for="lon">経度(東が正)</label><input id="lon" inputMode="decimal" value={lon} onInput={(e) => setLon(e.currentTarget.value)} /></div>
      </div>
      <ZoneSelect value={zone} onChange={setZone} />
      <div class="actions"><button type="button" class="btn secondary" onClick={apply}>この地点を使う</button></div>
      {message && <p class="note" role="status">{message}</p>}
    </div>
  );
}
