# 設計・計算の一次資料

確認日：2026-11-05。第三者コンテンツ本文・図版を配布するものではありません。計算方式の参照先と、独自実装の検証根拠を記録しています。

1. Swiss Ephemeris — 公式ライセンスと全体仕様
   https://www.astro.com/swisseph/swisseph.htm
   AGPL/Professionalの二重ライセンス。公開運用前に選択し、対象ソースを提供する。
2. Swiss Ephemeris — プログラミングインターフェース
   https://www.astro.com/swisseph/swephprg.htm
   UTC/UT1/TT、天体位置、暦の戻りフラグ、ハウス、サイデリアル設定。
3. GNU — ネットワーク利用とAGPL
   https://www.gnu.org/licenses/why-affero-gpl.html
   https://www.gnu.org/licenses/gpl-faq.en.html
4. Python — zoneinfo
   https://docs.python.org/3/library/zoneinfo.html
   IANAタイムゾーン、夏時間、fold、tzdataとシステムデータの関係。
5. Gene Keys — スフィアと天体の対応
   https://genekeys.com/docs/what-planets-does-each-sphere-of-the-golden-path-profile-correlate-to/
6. Gene Keys — 黄道上の鍵・ライン
   https://genekeys.com/docs/astrology-and-the-gene-keys/
   64等分、6ライン、トロピカル。ページ内の座標資料を参照。図版自体は同梱しない。
7. Jovian Archive — 出生前の計算
   https://jovianarchive.com/blogs/human-design-basics/introduction-to-the-human-design-system
   太陽の移動88度を遡る定義。固定88日とは区別する。
8. Gene Keys — 公式プロフィールとの相違
   https://genekeys.com/how-to-read-your-profile/
   使用暦、出生時刻・場所、他のソフトとの相違を確認するための資料。
9. bis「【数秘術・計算方法】あなたの本性は？ “運命数”別に紐解く、性格の特徴一覧」(数秘術鑑定士 YUMI IZUMI 監修) — ライフパスの方式
   https://bisweb.jp/lifestyle/153628
   生年月日の全桁を足し、11・22・33 が出たら止める。他流派を否定するものではない。
   数秘LIFE「数秘術計算で、自分や相手を知る」(数秘研究家ともこ) — 誕生数に相当する才能数の規則(11・22 で止める)
   https://www.tomoko635.jp/calculation/
10. 国立天文台 暦計算室 — 二十四節気
    https://eco.mtk.nao.ac.jp/koyomi/faq/24sekki.html.en
    将来の暦エンジンで検討する天文学的な定義。特定占術の流派規則まで定義する資料ではない。
11. Cloudflare — WebAssembly
    https://developers.cloudflare.com/workers/runtime-apis/webassembly/
    本番候補環境。特定バインディングの実動作は別途検証が必要。
12. Gene Keys — 利用条件
    https://genekeys.com/terms-and-conditions/
    ソフトウェアのAGPLとは別に文章・図版・名称の扱いを確認する。

コードはこのプロジェクト向けの独自実装。書籍本文の要約データベースや第三者の鑑定文は含めていません。

## 秘教占星術

- Alice A. Bailey, *Esoteric Astrology*(A Treatise on the Seven Rays, Vol. III)。Lucis Trust 1998年電子版の PDF ページで照合した。
  - 支配星(通常・秘教・ハイアラーキ): 第1章 表VI(PDF p.35)。表IV・V・VII(p.33〜35)
  - 惑星の光線と聖なる惑星・聖ならざる惑星: 第4章(p.241〜242, 246)
  - 星座を通じて働く光線: 第3章(p.235〜236)
  - 三つの十字: 第2章(p.161)、第6章(p.263〜264)
  - 太陽・ASC・月の扱い: 第1章(p.10)、第4章(p.246)
  - 覆い隠す惑星: p.8, 25, 68, 145, 155, 189, 213, 256
- 天体の位置は西洋占星術の計算をそのまま使う。地球は太陽黄経 + 180° の象徴的位置。ヴァルカンは位置を算出しない。
- 魂やパーソナリティの光線、意識の段階は判定しない。マスターデータと出典は `src/modules/esoteric/data.ts`。
