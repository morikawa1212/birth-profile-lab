// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { usableRecords, type ContentRecord } from "../src/ui/content";
import { contentHeading } from "../src/ui/labels";
import { MODULE_LOADERS } from "../src/modules/registry";

const rec = (key: string, patch: Partial<ContentRecord>): ContentRecord => ({ key, locale: "ja", body: "本文", sources: [], rights: { status: "owner_provided" }, review: "approved", ...patch });
describe("解説データ", () => {
  it("未確認と下書きを配信しない", () => {
    const m = usableRecords([rec("a", {}), rec("b", { review: "draft" }), rec("c", { rights: { status: "unreviewed" } }), { ...rec("d", {}), rights: undefined as never }]);
    expect([...m.keys()]).toEqual(["a"]);
  });
  it("下書きは試験版の指定があるときだけ表示する", () => {
    expect([...usableRecords([rec("b", { review: "draft" })], false).keys()]).toEqual([]);
    expect([...usableRecords([rec("b", { review: "draft" })], true).keys()]).toEqual(["b"]);
    expect([...usableRecords([rec("c", { review: "draft", rights: { status: "unreviewed" } })], true).keys()]).toEqual([]);
  });
  it("全キーの見出しを作れる", () => {
    for (const k of ["gk.sphere.iq", "gk.key.4", "gk.line.2", "gk.sphere.iq.line.2", "west.planet.sun", "west.sign.leo", "west.house.1", "west.angle.asc", "west.aspect.trine", "vedic.graha.rahu", "vedic.rashi.leo", "vedic.bhava.2", "vedic.lagna", "vedic.nakshatra.3", "vedic.pada.1", "num.life_path.11", "num.birthday.3", "eso.point.asc", "eso.sign.leo", "eso.cross.fixed", "eso.ray.7", "eso.planet.vulcan", "eso.planet.earth", "eso.ruler.hierarchical", "eso.article.1"]) {
      const h = contentHeading(k);
      expect(h, k).not.toContain("undefined");
      expect(h, k).not.toBe(k);
    }
    expect(Object.keys(MODULE_LOADERS).length).toBe(5);
  });
});
