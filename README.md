# Birth Profile Lab

出生情報から、遺伝子易経・西洋占星術・インド占星術・数秘術の計算結果を閲覧する無料サイトのソースです。計算はすべて閲覧者の端末内で行い、出生情報を送信しません。

**現状: 開発中(第3段階の画面まで完了)。公開していません。** このサイトは Gene Keys の公式サービスではありません。

## 構成
- `src/ui/` 画面
- `src/core/` 入力検証、共通の型
- `src/engine/` Swiss Ephemeris(WebAssembly)の接続層、計算の実行
- `src/time/` 同梱データによる現地時刻の変換、確認画面の内容
- `src/places/` 出生地の端末内検索
- `src/modules/` 占術ごとの計算。追加方法は `docs/adding-a-module.md`
- `vendor/swe/` 生成済みの WebAssembly。`scripts/build-wasm.sh` で公式ソースから再生成できる
- `public/ephe/` Swiss暦ファイル
- `public/data/` タイムゾーンと地名のデータ。生成は `scripts/build_tzdata.py`、`scripts/build_places.py`、出典は `ATTRIBUTION.txt`
- `oracle/` Python の計算試作。TypeScript 実装の照合基準で、本番では使わない
- `tests/` 合成データのテスト

解説本文はこのリポジトリに含めません(形式は `docs/CONTENT_FORMAT.md`)。結果は `contentKeys` だけを持ち、本文は別に管理するデータから引きます。

## 実行
```sh
npm install
npm test
npm run typecheck
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
```

照合基準の再生成:
```sh
python3 -m venv .venv && .venv/bin/pip install -r oracle/requirements-dev.txt
.venv/bin/python -m pytest -q oracle
PYTHONTZPATH= .venv/bin/python oracle/make_fixture.py "$PWD/public/ephe" tests/fixtures/oracle.json.gz 1000
PYTHONTZPATH= .venv/bin/python oracle/make_tz_fixture.py public/data/tzdata.json tests/fixtures/tz-oracle.json.gz
```

## 検証の範囲
テストは Python 試作との一致、内部動作、ブラウザ上の動作と外部送信の有無を確かめるものです。実機での確認は別途行います。公式チャートや外部の計算結果との照合は未実施で、第4段階で行います。

## ライセンス
AGPL-3.0-or-later。第三者の依存物は `THIRD_PARTY_NOTICES.md` を参照してください。
