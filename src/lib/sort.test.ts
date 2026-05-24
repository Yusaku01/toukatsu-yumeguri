import { describe, expect, it } from "vitest";
import { sortSpasForDisplay } from "./sort";
import type { Spa } from "./types";

const spa = (name: string, city: string, lat = 35.8, lng = 139.9): Spa => ({
  id: name,
  name,
  city,
  address: `${city}テスト`,
  officialUrl: "https://example.com/",
  googleMapsUrl: "https://example.com/maps",
  lat,
  lng,
  tags: [],
  lastCheckedAt: "2026-05-24",
});

describe("sortSpasForDisplay", () => {
  it("uses the fixed Tokatsu city order before facility name", () => {
    const sorted = sortSpasForDisplay([
      spa("吉川の湯", "吉川市"),
      spa("柏の湯", "柏市"),
      spa("松戸の湯", "松戸市"),
    ]);

    expect(sorted.map((item) => item.name)).toEqual([
      "松戸の湯",
      "柏の湯",
      "吉川の湯",
    ]);
  });

  it("sorts by nearest distance when the current location is available", () => {
    const sorted = sortSpasForDisplay(
      [
        spa("遠い湯", "柏市", 35.9, 139.9),
        spa("近い湯", "船橋市", 35.801, 139.901),
      ],
      { lat: 35.8, lng: 139.9 },
    );

    expect(sorted.map((item) => item.name)).toEqual(["近い湯", "遠い湯"]);
  });
});
