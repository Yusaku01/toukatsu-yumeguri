import { describe, expect, it } from "vitest";

import {
  clearUserState,
  createEmptyUserState,
  dismissMapProgressToast,
  earnStamp,
  hasStoredUserState,
  loadUserState,
  markMapProgressToastShown,
  markSpaVisited,
  mergeUserStates,
  parseUserState,
  revealStamp,
  saveUserState,
  serializeUserState,
  setLastFilters,
  setSpaInterested,
  shouldShowMapProgressToast,
  USER_STATE_STORAGE_KEY,
  type UserStateStorage,
} from "./user-state";

const baseTime = "2026-06-20T00:00:00.000Z";

const createMemoryStorage = (): UserStateStorage & {
  entries: Record<string, string>;
} => {
  const entries: Record<string, string> = {};

  return {
    entries,
    getItem: (key) => entries[key] ?? null,
    removeItem: (key) => {
      delete entries[key];
    },
    setItem: (key, value) => {
      entries[key] = value;
    },
  };
};

describe("user state", () => {
  it("creates a minimal versioned state envelope", () => {
    expect(createEmptyUserState(baseTime, "device-a")).toEqual({
      schemaVersion: 1,
      deviceId: "device-a",
      createdAt: baseTime,
      updatedAt: baseTime,
      visited: {},
      interested: {},
      stamps: {},
    });
  });

  it("serializes and parses valid user state", () => {
    const state = setSpaInterested(
      markSpaVisited(
        createEmptyUserState(baseTime, "device-a"),
        "spa-metsa-otaka",
        "2026-06-20T01:00:00.000Z",
      ),
      "sumire-minami-kashiwa",
      true,
      "2026-06-20T02:00:00.000Z",
    );

    expect(parseUserState(serializeUserState(state))).toEqual(state);
  });

  it("rejects invalid stored values", () => {
    expect(parseUserState("{broken")).toBeUndefined();
    expect(
      parseUserState(JSON.stringify({ schemaVersion: 999 })),
    ).toBeUndefined();
  });

  it("loads an empty state when storage is missing or invalid", () => {
    const storage = createMemoryStorage();
    storage.setItem(USER_STATE_STORAGE_KEY, "{broken");

    expect(loadUserState(storage).visited).toEqual({});
  });

  it("does not throw when storage access fails", () => {
    const throwingStorage: UserStateStorage = {
      getItem: () => {
        throw new Error("storage blocked");
      },
      removeItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => {
        throw new Error("storage blocked");
      },
    };
    const state = createEmptyUserState(baseTime, "device-a");

    expect(loadUserState(throwingStorage).visited).toEqual({});
    expect(hasStoredUserState(throwingStorage)).toBe(false);
    expect(saveUserState(state, throwingStorage)).toBe(false);
    expect(clearUserState(throwingStorage)).toBe(false);
  });

  it("saves state with the namespaced storage key", () => {
    const storage = createMemoryStorage();
    const state = createEmptyUserState(baseTime, "device-a");

    expect(saveUserState(state, storage)).toBe(true);
    expect(hasStoredUserState(storage)).toBe(true);
    expect(parseUserState(storage.entries[USER_STATE_STORAGE_KEY])).toEqual(
      state,
    );
  });

  it("clears saved user state from storage", () => {
    const storage = createMemoryStorage();
    const state = createEmptyUserState(baseTime, "device-a");

    saveUserState(state, storage);

    expect(clearUserState(storage)).toBe(true);
    expect(storage.entries[USER_STATE_STORAGE_KEY]).toBeUndefined();
    expect(hasStoredUserState(storage)).toBe(false);
    expect(loadUserState(storage).visited).toEqual({});
  });

  it("marks visits without replacing the original visitedAt", () => {
    const firstState = markSpaVisited(
      createEmptyUserState(baseTime, "device-a"),
      "spa-metsa-otaka",
      "2026-06-20T01:00:00.000Z",
    );
    const secondState = markSpaVisited(
      firstState,
      "spa-metsa-otaka",
      "2026-06-20T03:00:00.000Z",
    );

    expect(secondState.visited["spa-metsa-otaka"]).toEqual({
      value: true,
      visitedAt: "2026-06-20T01:00:00.000Z",
      updatedAt: "2026-06-20T03:00:00.000Z",
    });
  });

  it("keeps stamp reveal state monotonic", () => {
    const earnedState = earnStamp(
      createEmptyUserState(baseTime, "device-a"),
      "city:kashiwa:complete",
      "2026-06-20T01:00:00.000Z",
    );
    const revealedState = revealStamp(
      earnedState,
      "city:kashiwa:complete",
      "2026-06-20T02:00:00.000Z",
    );
    const repeatedEarnState = earnStamp(
      revealedState,
      "city:kashiwa:complete",
      "2026-06-20T03:00:00.000Z",
    );

    expect(repeatedEarnState.stamps["city:kashiwa:complete"]).toEqual({
      state: "revealed",
      earnedAt: "2026-06-20T01:00:00.000Z",
      revealedAt: "2026-06-20T02:00:00.000Z",
      updatedAt: "2026-06-20T02:00:00.000Z",
    });
  });

  it("stores valid last filters only", () => {
    const state = setLastFilters(
      createEmptyUserState(baseTime, "device-a"),
      {
        citySlug: "kashiwa",
        featureIds: ["sauna", "onsen"],
        sortMode: "nearby",
      },
      "2026-06-20T01:00:00.000Z",
    );

    expect(parseUserState(serializeUserState(state))?.lastFilters).toEqual({
      citySlug: "kashiwa",
      featureIds: ["sauna", "onsen"],
      sortMode: "nearby",
      updatedAt: "2026-06-20T01:00:00.000Z",
    });
  });

  it("stores map progress toast display and dismissal history", () => {
    const initialState = createEmptyUserState(baseTime, "device-a");
    const shownState = markMapProgressToastShown(
      initialState,
      "2026-06-20T01:00:00.000Z",
    );
    const dismissedState = dismissMapProgressToast(
      shownState,
      "2026-06-20T01:00:03.000Z",
    );

    expect(shouldShowMapProgressToast(initialState)).toBe(true);
    expect(shouldShowMapProgressToast(shownState)).toBe(true);
    expect(shouldShowMapProgressToast(dismissedState)).toBe(false);
    expect(parseUserState(serializeUserState(dismissedState))?.ui).toEqual({
      mapProgressToast: {
        lastShownAt: "2026-06-20T01:00:00.000Z",
        dismissedAt: "2026-06-20T01:00:03.000Z",
        updatedAt: "2026-06-20T01:00:03.000Z",
      },
    });
  });

  it("merges user states by id without rolling revealed stamps back", () => {
    const currentState = revealStamp(
      earnStamp(
        markSpaVisited(
          createEmptyUserState(baseTime, "device-a"),
          "spa-metsa-otaka",
          "2026-06-20T01:00:00.000Z",
        ),
        "visit:spa-metsa-otaka",
        "2026-06-20T01:30:00.000Z",
      ),
      "visit:spa-metsa-otaka",
      "2026-06-20T02:00:00.000Z",
    );
    const incomingState = earnStamp(
      setSpaInterested(
        createEmptyUserState("2026-06-19T00:00:00.000Z", "device-b"),
        "sumire-minami-kashiwa",
        true,
        "2026-06-20T03:00:00.000Z",
      ),
      "visit:spa-metsa-otaka",
      "2026-06-20T01:30:00.000Z",
    );
    const mergedState = mergeUserStates(
      currentState,
      incomingState,
      "2026-06-20T04:00:00.000Z",
    );

    expect(mergedState.deviceId).toBe("device-a");
    expect(mergedState.createdAt).toBe("2026-06-19T00:00:00.000Z");
    expect(mergedState.visited["spa-metsa-otaka"]?.value).toBe(true);
    expect(mergedState.interested["sumire-minami-kashiwa"]?.value).toBe(true);
    expect(mergedState.stamps["visit:spa-metsa-otaka"]?.state).toBe("revealed");
  });

  it("merges newer ui history when user states are merged", () => {
    const currentState = markMapProgressToastShown(
      createEmptyUserState(baseTime, "device-a"),
      "2026-06-20T01:00:00.000Z",
    );
    const incomingState = dismissMapProgressToast(
      createEmptyUserState(baseTime, "device-b"),
      "2026-06-20T02:00:00.000Z",
    );
    const mergedState = mergeUserStates(
      currentState,
      incomingState,
      "2026-06-20T03:00:00.000Z",
    );

    expect(mergedState.ui?.mapProgressToast).toEqual({
      lastShownAt: "2026-06-20T02:00:00.000Z",
      dismissedAt: "2026-06-20T02:00:00.000Z",
      updatedAt: "2026-06-20T02:00:00.000Z",
    });
  });
});
