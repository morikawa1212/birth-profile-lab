// SPDX-License-Identifier: AGPL-3.0-or-later
// 運営者が書いた文章を表示するための最小限の Markdown。HTML は解釈せず、すべて文字として表示する。
import type { ComponentChildren } from "preact";

function inline(text: string): ComponentChildren[] {
  return text.split(/(\*\*.+?\*\*)/g).filter(Boolean).map((part, i) => (part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
}

const cells = (row: string) => row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

export function MiniMarkdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.startsWith("### ")) return <h3 key={i}>{inline(block.slice(4))}</h3>;
        if (block.startsWith("## ")) return <h2 key={i}>{inline(block.slice(3))}</h2>;
        if (block.startsWith("|")) {
          const [head = "", , ...rows] = block.split("\n");
          return (
            <div class="table-scroll" key={i}>
              <table>
                <thead><tr>{cells(head).map((c, k) => <th key={k} scope="col">{inline(c)}</th>)}</tr></thead>
                <tbody>{rows.map((r, n) => <tr key={n}>{cells(r).map((c, k) => <td key={k}>{inline(c)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        return <p key={i}>{inline(block)}</p>;
      })}
    </>
  );
}
