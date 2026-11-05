// SPDX-License-Identifier: AGPL-3.0-or-later
// 解説データの読み込み。承認済みのレコードだけを使い、本文はテキストとして表示する。
export interface ContentRecord {
  key: string;
  locale: "ja";
  title?: string;
  /** 結果の一覧に添える短い要約 */
  summary?: string;
  body: string | null;
  sections?: { heading: string; body: string }[];
  questions?: string[];
  attributes?: { name: string; value: string; source: string }[];
  sources: { title: string; author?: string; page?: string; url?: string }[];
  rights: { status: "owner_original" | "owner_provided" | "licensed" | "quotation" | "unreviewed"; note?: string };
  review: "draft" | "approved";
}
export type ContentMap = ReadonlyMap<string, ContentRecord>;

/** 試験版だけ確認中の下書きも表示する。本番のビルドでは承認済みのみ */
const SHOW_DRAFTS = import.meta.env.VITE_SHOW_DRAFTS === "1";

export function usableRecords(records: readonly ContentRecord[], showDrafts = SHOW_DRAFTS): ContentMap {
  return new Map(records.filter((r) => (r.review === "approved" || (showDrafts && r.review === "draft")) && r.rights?.status !== "unreviewed" && !!r.rights).map((r) => [r.key, r]));
}

export async function loadContent(): Promise<ContentMap> {
  try {
    const r = await fetch("content/ja.json");
    if (!r.ok) return new Map();
    const data = (await r.json()) as { records?: ContentRecord[] };
    return usableRecords(data.records ?? []);
  } catch {
    // 解説がなくても計算結果は表示する
    return new Map();
  }
}
