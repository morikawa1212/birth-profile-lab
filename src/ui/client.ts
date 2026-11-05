// SPDX-License-Identifier: AGPL-3.0-or-later
import type { WorkerApi } from "../engine/worker";

export class UserError extends Error {}
const SYSTEM_MESSAGE = "計算の準備に失敗しました。通信状況を確認して、ページを読み込み直してください。";

const worker = new Worker(new URL("../engine/worker.ts", import.meta.url), { type: "module" });
const pending = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void }>();
let nextId = 1;

worker.onmessage = (e: MessageEvent<{ id: number; value?: unknown; error?: { input: boolean; message?: string } }>) => {
  const p = pending.get(e.data.id);
  if (!p) return;
  pending.delete(e.data.id);
  if (e.data.error) p.reject(new UserError(e.data.error.input ? e.data.error.message : SYSTEM_MESSAGE));
  else p.resolve(e.data.value as never);
};
worker.onerror = () => {
  for (const p of pending.values()) p.reject(new UserError(SYSTEM_MESSAGE));
  pending.clear();
};
worker.postMessage({ id: 0, base: new URL(".", document.baseURI).href });

export function call<M extends keyof WorkerApi>(method: M, ...args: Parameters<WorkerApi[M]>): Promise<ReturnType<WorkerApi[M]>> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve: resolve as (v: never) => void, reject });
    worker.postMessage({ id, method, args });
  });
}
