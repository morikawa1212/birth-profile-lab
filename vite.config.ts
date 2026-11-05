// SPDX-License-Identifier: AGPL-3.0-or-later
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

// 配信先のパスに依存しないよう相対参照でビルドする
export default defineConfig({
  base: "./",
  plugins: [preact()],
  worker: { format: "es" },
  build: { target: "es2022", assetsInlineLimit: 0, modulePreload: { polyfill: false } },
  test: { include: ["tests/*.test.ts"] },
} as never);
