// SPDX-License-Identifier: AGPL-3.0-or-later
// サイト固有の設定。ビルド時の環境変数で稼働中の版とソースの場所を埋め込む。
export const HP_URL = "https://morikawatakashi.com/";
export const DICTIONARY_URL = (key: number) => `https://morikawatakashi.com/iching/#ich-hex-${key}`;
export const SESSION_URL = "https://morikawatakashi.com/session/coaching-session/";
export const OFFICIAL_URL = "https://genekeys.com/";
export const NOT_OFFICIAL = "このサイトは公式のものではありません。詳しくは";
export const SOURCE_URL: string | undefined = import.meta.env.VITE_SOURCE_URL || undefined;
export const BUILD_VERSION: string = import.meta.env.VITE_BUILD_VERSION || "開発版";
