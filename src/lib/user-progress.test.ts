import { describe, expect, it } from "vitest";

import type { Spa } from "./types";
import { createEmptyUserState, markSpaVisited } from "./user-state";
import {
  calculateYumeguriProgress,
  getYumeguriProgressCopy,
  syncCompletionStamps,
} from "./user-progress";

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

const spas: Spa[] = [
  { ...baseSpa, id: "kashiwa-a", name: "柏の湯 A", city: "柏市" },
  { ...baseSpa, id: "kashiwa-b", name: "柏の湯 B", city: "柏市" },
  { ...baseSpa, id: "matsudo-a", name: "松戸の湯 A", city: "松戸市" },
];

describe("user progress", () => {
  it("calculates city progress from visited spa ids", () => {
    const state = markSpaVisited(
      createEmptyUserState("2026-06-20T00:00:00.000Z", "device-a"),
      "kashiwa-a",
      "2026-06-20T01:00:00.000Z",
    );
    const progress = calculateYumeguriProgress(spas, state, "柏市");

    expect(progress).toMatchObject({
      scopeKey: "city:kashiwa",
      scopeLabel: "柏",
      visitedCount: 1,
      totalCount: 2,
      remainingCount: 1,
      percentage: 50,
      isComplete: false,
    });
    expect(getYumeguriProgressCopy(progress)).toBe("あと1件");
  });

  it("earns facility and city completion stamps without rolling them back", () => {
    const visitedState = markSpaVisited(
      markSpaVisited(
        createEmptyUserState("2026-06-20T00:00:00.000Z", "device-a"),
        "kashiwa-a",
        "2026-06-20T01:00:00.000Z",
      ),
      "kashiwa-b",
      "2026-06-20T02:00:00.000Z",
    );
    const stampedState = syncCompletionStamps(
      visitedState,
      spas,
      "2026-06-20T03:00:00.000Z",
    );

    expect(stampedState.stamps["visit:kashiwa-a"]?.state).toBe("pending");
    expect(stampedState.stamps["visit:kashiwa-b"]?.state).toBe("pending");
    expect(stampedState.stamps["city:kashiwa:complete"]?.state).toBe("pending");
    expect(stampedState.stamps["all:complete"]).toBeUndefined();

    const unvisitedAgain = {
      ...stampedState,
      visited: {
        ...stampedState.visited,
        "kashiwa-b": {
          value: false,
          updatedAt: "2026-06-20T04:00:00.000Z",
        },
      },
    };

    expect(
      syncCompletionStamps(
        unvisitedAgain,
        spas,
        "2026-06-20T05:00:00.000Z",
      ).stamps["city:kashiwa:complete"]?.state,
    ).toBe("pending");
  });

  it("earns all completion stamp when every spa has been visited", () => {
    const visitedState = spas.reduce(
      (state, spa, index) =>
        markSpaVisited(
          state,
          spa.id,
          `2026-06-20T0${index + 1}:00:00.000Z`,
        ),
      createEmptyUserState("2026-06-20T00:00:00.000Z", "device-a"),
    );

    expect(
      syncCompletionStamps(
        visitedState,
        spas,
        "2026-06-20T04:00:00.000Z",
      ).stamps["all:complete"]?.state,
    ).toBe("pending");
  });
});
