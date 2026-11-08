// SPDX-License-Identifier: AGPL-3.0-or-later
// 結果の一覧やチャートの選択で、その場に解説の本文を出す。詳しい内容は項目のページで読む。
import type { ContentMap } from "./content";
import { contentHeading } from "./labels";

export function Explanation({ keys, content }: { keys: readonly string[]; content: ContentMap }) {
  const records = keys.map((k) => [k, content.get(k)] as const).filter(([, r]) => r?.body);
  if (!records.length) return <p class="pending">解説準備中</p>;
  return (
    <div class="explanation">
      {records.map(([k, r]) => (
        <section key={k}>
          <h4>{r!.title ?? contentHeading(k)}</h4>
          {r!.review === "draft" && <p class="draft-tag">確認中の下書き</p>}
          {r!.summary && <p class="summary-line">{r!.summary}</p>}
          {r!.body!.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </section>
      ))}
    </div>
  );
}

/** 解説がある項目かどうか */
export const hasExplanation = (keys: readonly string[], content: ContentMap): boolean => keys.some((k) => !!content.get(k)?.body);
