import { describe, expect, it } from "vitest";

import {
  getCityFromSlug,
  getCitySlug,
  getFeatureIdsFromSearchParams,
} from "./filter-url";

describe("filter URL helpers", () => {
  it("maps city names to stable URL slugs", () => {
    expect(getCitySlug("松戸市")).toBe("matsudo");
    expect(getCitySlug("柏市")).toBe("kashiwa");
    expect(getCitySlug("流山市")).toBe("nagareyama");
  });

  it("resolves stable URL slugs back to city names", () => {
    expect(getCityFromSlug("matsudo")).toBe("松戸市");
    expect(getCityFromSlug("kashiwa")).toBe("柏市");
    expect(getCityFromSlug("unknown")).toBeUndefined();
  });

  it("reads features first and keeps legacy tags as a fallback", () => {
    expect(
      getFeatureIdsFromSearchParams(
        new URLSearchParams("features=sauna,onsen,invalid&tags=food"),
      ),
    ).toEqual(["sauna", "onsen"]);
    expect(
      getFeatureIdsFromSearchParams(new URLSearchParams("tags=food")),
    ).toEqual(["food"]);
  });
});
