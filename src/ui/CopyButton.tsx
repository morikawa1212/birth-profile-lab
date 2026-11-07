// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState } from "preact/hooks";

async function writeClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // 古いブラウザや権限の制限がある場合の代替手段
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.className = "copy-source";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) throw new Error("copy_failed");
  }
}

export function CopyButton({ label, text, primary = false }: { label: string; text: () => string; primary?: boolean }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    clearTimeout(timer.current);
    try {
      await writeClipboard(text());
      setState("done");
    } catch {
      setState("failed");
    }
    timer.current = window.setTimeout(() => setState("idle"), 3000);
  };
  return (
    <span class="copy">
      <button type="button" class={`btn copy-btn ${primary ? "primary" : "secondary"}`} onClick={copy}>{state === "done" ? "コピーしました" : label}</button>
      <span class="copy-status" role="status">{state === "failed" ? "コピーできませんでした。画面の文字を選択してコピーしてください。" : state === "done" ? "クリップボードにコピーしました。" : ""}</span>
    </span>
  );
}
