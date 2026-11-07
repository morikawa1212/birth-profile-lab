// SPDX-License-Identifier: AGPL-3.0-or-later
// サイト固有の設定。ビルド時の環境変数で稼働中の版とソースの場所を埋め込む。
export const HP_URL = "https://morikawatakashi.com/";
export const DICTIONARY_URL = (key: number) => `https://morikawatakashi.com/iching/#ich-hex-${key}`;
/**
 * 64卦辞典の検索欄に番号を入れた状態で開く URL。「38.1」のようなチャートの表記を受け付ける。
 * 出生情報から求めた値なので、サーバーや GA4 の検索語に渡る ?q= ではなく # で渡す。
 */
export const DICTIONARY_SEARCH_URL = (values: readonly string[]) => `https://morikawatakashi.com/iching/#q=${encodeURIComponent(values.join(" "))}`;
export const SESSION_URL = "https://morikawatakashi.com/session/coaching-session/";
export const INQUIRY_URL = "https://morikawatakashi.com/inquiry/";
export const OFFICIAL_URL = "https://genekeys.com/";
export const NOT_OFFICIAL = "このサイトは公式のものではありません。詳しくは";
export const SOURCE_URL: string | undefined = import.meta.env.VITE_SOURCE_URL || undefined;
export const BUILD_VERSION: string = import.meta.env.VITE_BUILD_VERSION || "開発版";
