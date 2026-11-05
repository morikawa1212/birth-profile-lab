# 解説データの形式

解説は `content/ja.json` として配信します。このリポジトリには空のファイルだけを置き、本文は別に管理します。未登録の項目は「解説準備中」と表示します。本文はテキストとして表示し、HTML は解釈しません。空行で段落を分けます。

```json
{
  "schemaVersion": 1,
  "records": [
    {
      "key": "gk.key.4",
      "locale": "ja",
      "title": "第4の鍵",
      "summary": "結果の一覧に添える短い要約",
      "body": "本文",
      "sections": [{ "heading": "見出し", "body": "本文" }],
      "questions": ["観照の問い"],
      "attributes": [{ "name": "身体部位", "value": "値", "source": "出典" }],
      "sources": [{ "title": "書名", "author": "著者", "page": "p.10", "url": "https://..." }],
      "rights": { "status": "owner_provided", "note": "" },
      "review": "approved"
    }
  ]
}
```

`review` が `approved`(試験版は `draft` も確認中の表示付き)で、`rights.status` が `unreviewed` 以外のレコードだけを表示します。

| キー | 内容 | 件数 |
|---|---|---|
| `gk.key.1`〜`64` | 鍵 | 64 |
| `gk.sphere.<id>` | スフィア(コアと天職は同じ配置で別の項目) | 12 |
| `gk.line.1`〜`6` | 一般のライン | 6 |
| `gk.sphere.<id>.line.1`〜`6` | スフィア別のライン(任意。未登録なら欄を出さない) | 72 |
| `west.planet.<id>` `west.sign.<id>` `west.house.1`〜`12` `west.angle.asc|mc` `west.aspect.<id>` | 西洋 | 41 |
| `vedic.graha.<id>` `vedic.rashi.<id>` `vedic.bhava.1`〜`12` `vedic.lagna` `vedic.nakshatra.1`〜`27` `vedic.pada.1`〜`4` | インド | 65 |
| `num.life_path.<n>` `num.birthday.<n>` | 数秘 | ライフパス12、誕生数は別途 |

スフィアの id: `lifes_work` `evolution` `radiance` `purpose` `attraction` `iq` `eq` `sq` `core` `vocation` `culture` `pearl`
星座の id: `aries` `taurus` `gemini` `cancer` `leo` `virgo` `libra` `scorpio` `sagittarius` `capricorn` `aquarius` `pisces`
