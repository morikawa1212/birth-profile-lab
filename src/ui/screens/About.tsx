// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CalcResult } from "../../engine/worker";
import { MODULE_LABELS, MODULE_ORDER } from "../labels";
import { BUILD_VERSION, HP_URL, NOT_OFFICIAL, OFFICIAL_URL, SOURCE_URL } from "../site";
import { SettingsTable } from "./Results";

export function AboutScreen({ hasResult, result }: { hasResult: boolean; result: CalcResult | null }) {
  return (
    <section>
      <p><a href={hasResult ? "#overview" : "#"}>{hasResult ? "結果へ戻る" : "入力へ戻る"}</a></p>
      <h1 tabIndex={-1}>このサイトについて</h1>
      <div class="stack">
        <section class="card">
          <h2>出生情報の扱い</h2>
          <p>計算はすべて、お使いの端末のブラウザの中で行います。生年月日、時刻、出生地はサーバーへ送信せず、記録もしません。このアプリの画面にはアクセス解析を入れていません。「入力情報をこの端末に保存する」にチェックを入れた場合だけ端末に保存し、チェックを外すと消えます。コピーボタンでコピーした内容には生年月日・時刻・出生地が含まれますが、貼り付けるまで端末の外へは出ません。</p>
        </section>
        <section class="card">
          <h2>遺伝子易経について</h2>
          <p>{NOT_OFFICIAL}<a href={OFFICIAL_URL} rel="noreferrer">公式サイト</a>をご覧ください。Gene Keys は Gene Keys Publishing Ltd. の登録商標です。</p>
        </section>
        <section class="card">
          <h2>結果が他のサイトや体系と異なる理由</h2>
          <ul>
            <li>西洋占星術はトロピカル、インド占星術はサイデリアルの黄道帯を使うため、同じ天体でも星座が変わることがあります。</li>
            <li>ハウスの分け方、アヤナムサ、ノードの種類、オーブなどの方式によって結果が変わります。</li>
            <li>出生時刻が数分違うだけで、月に関わる項目や ASC が変わることがあります。</li>
            <li>数秘術には複数の計算方式があります。</li>
            <li>複数の体系は同じ出生情報を使うため、結果の一致を独立した検査の一致として扱うことはできません。</li>
          </ul>
        </section>
        <section class="card">
          <h2>採用している方法</h2>
          {result ? MODULE_ORDER.map((id) => (
            <details key={id}><summary>{MODULE_LABELS[id]}</summary><SettingsTable module={result.modules[id]!} /></details>
          )) : <p>結果の画面で、体系ごとの計算方法を確認できます。</p>}
        </section>
        <section class="card">
          <h2>ソースコードとライセンス</h2>
          <p>このアプリは GNU AGPL v3 以降で公開します。{SOURCE_URL ? <a href={SOURCE_URL} rel="noreferrer">ソースコードを見る</a> : "ソースコードは公開準備中です。"}</p>
          <ul>
            <li><a href="LICENSE.txt">ライセンス全文</a></li>
            <li><a href="THIRD_PARTY_NOTICES.txt">第三者の依存物</a></li>
            <li><a href="data/ATTRIBUTION.txt">地名・時刻データの出典</a></li>
          </ul>
          <p>Swiss Ephemeris © Astrodienst AG。地名データ: GeoNames(CC BY 4.0)。「全国地方公共団体コード」(総務省)を加工して作成。版: {BUILD_VERSION}</p>
        </section>
        <section class="card">
          <h2>運営</h2>
          <p><a href={HP_URL} rel="noreferrer">森川尭史のHP</a></p>
        </section>
      </div>
    </section>
  );
}
