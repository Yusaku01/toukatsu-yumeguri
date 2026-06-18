import { describe, expect, it } from "vitest";
import {
  getFeatureFilterCounts,
  isFeatureFilterId,
  spaMatchesFeatureFilters,
} from "./filters";
import type { Spa } from "./types";

const baseSpa: Spa = {
  id: "sample",
  name: "サンプル湯",
  city: "柏市",
  address: "千葉県柏市",
  officialUrl: "https://example.com",
  googleMapsUrl: "https://example.com/maps",
  lat: 35.86,
  lng: 139.97,
  tags: [],
  lastCheckedAt: "2026-06-14",
};

describe("feature filters", () => {
  it("matches all selected feature filters", () => {
    const spa: Spa = {
      ...baseSpa,
      tags: ["天然温泉", "駅近"],
      tagGroups: {
        bath: ["天然温泉"],
        sauna: ["サウナ"],
        food: ["食事処"],
      },
    };

    expect(spaMatchesFeatureFilters(spa, ["sauna", "onsen", "food"])).toBe(
      true,
    );
    expect(spaMatchesFeatureFilters(spa, ["sauna", "ganbanyoku"])).toBe(false);
  });

  it("falls back to legacy tags when structured groups are missing", () => {
    const spa: Spa = {
      ...baseSpa,
      tags: ["サウナ", "食事処"],
    };

    expect(spaMatchesFeatureFilters(spa, ["sauna", "food"])).toBe(true);
  });

  it("counts feature filter candidates", () => {
    const spas: Spa[] = [
      { ...baseSpa, id: "a", tags: ["天然温泉", "駅近"] },
      { ...baseSpa, id: "b", tags: ["岩盤浴"] },
      { ...baseSpa, id: "c", tags: [], tagGroups: { food: ["食事処"] } },
    ];

    expect(
      getFeatureFilterCounts(spas).map(({ id, count }) => ({ id, count })),
    ).toEqual([
      { id: "sauna", count: 0 },
      { id: "onsen", count: 1 },
      { id: "ganbanyoku", count: 1 },
      { id: "food", count: 1 },
      { id: "station", count: 1 },
    ]);
  });

  it("guards feature filter ids", () => {
    expect(isFeatureFilterId("sauna")).toBe(true);
    expect(isFeatureFilterId("unknown")).toBe(false);
  });
});
