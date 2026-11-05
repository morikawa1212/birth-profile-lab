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
9. World Numerology / Hans Decoz — ライフパスの方式
   https://www.worldnumerology.com/numerology-life-path/
   年月日ごとの還元と11/22/33の保持。試作が採用する方式の出典であり、他流派を否定しない。
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
