# 第三者の依存物

- **Swiss Ephemeris 2.10.03**(`vendor/swe/`、`public/ephe/`): Astrodienst AG。AGPL を選択して利用。ソース: https://github.com/aloistr/swisseph タグ v2.10.03(175e1fc)。WebAssembly は `scripts/build-wasm.sh`(Emscripten 3.1.74)で生成。
- `sepl_18.se1` sha256 `ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66`
- `semo_18.se1` sha256 `1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7`
- **Preact 10.25.4**(配信物に含む): MIT License、Copyright (c) 2015-present Jason Miller。
- **Emscripten 3.1.74 のランタイム**(`vendor/swe/swe.mjs` に含む): MIT License と University of Illinois/NCSA License の二重ライセンス。
- **pyswisseph 2.10.3.2**(`oracle/` の開発時のみ): Stanislas Marquis。AGPL。
- **tzdata、pytest**(`oracle/` の開発時のみ)、**TypeScript、Vite、Vitest、Playwright、axe-core**(開発時のみ): 各パッケージの表記に従う。

- **GeoNames、全国地方公共団体コード(総務省)、IANA tzdata 2026.6**(`public/data/`): 出典と加工の内容は `public/data/ATTRIBUTION.txt`。

Gene Keys の書籍、文章、画像、ロゴ、商標はこのライセンスの対象外で、このリポジトリに含めません。
