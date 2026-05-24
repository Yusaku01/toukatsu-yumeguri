import { describe, expect, it } from "vitest";
import { formatDistance, getDistanceInMeters } from "./geo";

describe("getDistanceInMeters", () => {
  it("returns an approximate walking-scale distance between two nearby points", () => {
    const distance = getDistanceInMeters(
      { lat: 35.8731308, lng: 139.922819 },
      { lat: 35.8413044, lng: 139.9457702 },
    );

    expect(distance).toBeGreaterThan(3_900);
    expect(distance).toBeLessThan(4_200);
  });
});

describe("formatDistance", () => {
  it("uses meters below 1km and one decimal kilometer above it", () => {
    expect(formatDistance(420)).toBe("420m");
    expect(formatDistance(1420)).toBe("1.4km");
  });
});
