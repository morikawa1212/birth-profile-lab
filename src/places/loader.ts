// SPDX-License-Identifier: AGPL-3.0-or-later
// 地名データは必要になったときに同じ配信元から読み込む。検索語は送らない。
import { buildJapanIndex, buildWorldIndex, type JapanPlaces, type PlaceIndex, type WorldPlaces } from "./search";

const cache = new Map<string, Promise<PlaceIndex>>();
async function json<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error("load_failed");
  return r.json() as Promise<T>;
}
function once(name: string, make: () => Promise<PlaceIndex>): Promise<PlaceIndex> {
  let p = cache.get(name);
  if (!p) {
    p = make().catch((e) => {
      cache.delete(name);
      throw e;
    });
    cache.set(name, p);
  }
  return p;
}
export const japanIndex = () => once("jp", async () => buildJapanIndex(await json<JapanPlaces>("data/places-jp.json")));
export const japanExtraIndex = () => once("jp-extra", async () => buildJapanIndex(await json<JapanPlaces>("data/places-jp-extra.json")));
export const worldIndex = () => once("world", async () => buildWorldIndex(await json<WorldPlaces>("data/places-world.json")));
