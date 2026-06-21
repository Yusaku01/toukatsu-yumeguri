import { describe, expect, it } from "vitest";

import {
  getCityFromSlug,
  getCitySlug,
  getFeatureIdsFromSearchParams,
  getSpaIdFromSearchParams,
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

  it("returns a shared spa id only when it is known", () => {
    const spaIds = ["spa-metsa-otaka", "sumire-minami-kashiwa"];

    expect(
      getSpaIdFromSearchParams(
        new URLSearchParams("spa=spa-metsa-otaka"),
        spaIds,
      ),
    ).toBe("spa-metsa-otaka");
    expect(
      getSpaIdFromSearchParams(new URLSearchParams("spa=unknown"), spaIds),
    ).toBeUndefined();
    expect(
      getSpaIdFromSearchParams(new URLSearchParams("city=kashiwa"), spaIds),
    ).toBeUndefined();
  });
});
