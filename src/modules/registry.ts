// SPDX-License-Identifier: AGPL-3.0-or-later
// 占術の登録。新しい体系はここに1行追加し、既存モジュールを書き換えない。各体系は必要時に読み込む。
import type { DivinationModule } from "../core/types";

type AnyModule = DivinationModule<never, unknown>;

export const MODULE_LOADERS: Readonly<Record<string, () => Promise<AnyModule>>> = {
  gene_keys: async () => (await import("./gene_keys/index")).geneKeysModule as unknown as AnyModule,
  western: async () => (await import("./western/index")).westernModule as unknown as AnyModule,
  vedic: async () => (await import("./vedic/index")).vedicModule as unknown as AnyModule,
  numerology: async () => (await import("./numerology/index")).numerologyModule as unknown as AnyModule,
};
