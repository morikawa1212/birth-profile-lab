// SPDX-License-Identifier: AGPL-3.0-or-later
// 本番と同じ _headers を適用し、サブパスに配信して dist を確認するテスト用サーバー
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
const dist = new URL("../../dist/", import.meta.url).pathname;
const BASE = "/profile-lab/app/";
const headers = Object.fromEntries(fs.readFileSync(dist + "_headers", "utf8").split("\n").slice(1).filter(Boolean).map((l) => {
  const i = l.indexOf(":");
  return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
}));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".json": "application/json", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8" };
http.createServer((q, s) => {
  const u = new URL(q.url, "http://x");
  if (!u.pathname.startsWith(BASE)) { s.writeHead(404); return s.end(); }
  const file = path.join(dist, decodeURIComponent(u.pathname.slice(BASE.length)) || "index.html");
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { s.writeHead(404, headers); return s.end(); }
  s.writeHead(200, { ...headers, "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(s);
}).listen(8796, "127.0.0.1");
