import { z } from "zod";

import { featureFilterIds, type FeatureFilterId } from "./filters";

export const USER_STATE_SCHEMA_VERSION = 1;
export const USER_STATE_STORAGE_KEY = "toukatsu-yumeguri:user-state:v1";

export type YumeguriSortMode = "default" | "nearby";

export type UserStateVisitedEntry = {
  value: boolean;
  visitedAt?: string;
  updatedAt: string;
};

export type UserStateInterestedEntry = {
  value: boolean;
  updatedAt: string;
};

export type UserStateStampEntry = {
  state: "pending" | "revealed";
  earnedAt: string;
  revealedAt?: string;
  updatedAt: string;
};

export type UserStateLastFilters = {
  citySlug?: string;
  featureIds?: FeatureFilterId[];
  sortMode?: YumeguriSortMode;
  updatedAt: string;
};

export type UserStateMapProgressToast = {
  lastShownAt?: string;
  dismissedAt?: string;
  updatedAt: string;
};

export type UserStateUi = {
  mapProgressToast?: UserStateMapProgressToast;
};

export type YumeguriUserState = {
  schemaVersion: typeof USER_STATE_SCHEMA_VERSION;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  visited: Record<string, UserStateVisitedEntry>;
  interested: Record<string, UserStateInterestedEntry>;
  stamps: Record<string, UserStateStampEntry>;
  lastFilters?: UserStateLastFilters;
  ui?: UserStateUi;
};

export type UserStateStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

const isoTimestampSchema = z.iso.datetime();

const featureFilterIdSchema = z.enum(
  featureFilterIds as [FeatureFilterId, ...FeatureFilterId[]],
);

const visitedEntrySchema = z.object({
  value: z.boolean(),
  visitedAt: isoTimestampSchema.optional(),
  updatedAt: isoTimestampSchema,
});

const interestedEntrySchema = z.object({
  value: z.boolean(),
  updatedAt: isoTimestampSchema,
});

const stampEntrySchema = z.object({
  state: z.enum(["pending", "revealed"]),
  earnedAt: isoTimestampSchema,
  revealedAt: isoTimestampSchema.optional(),
  updatedAt: isoTimestampSchema,
});

const lastFiltersSchema = z.object({
  citySlug: z.string().optional(),
  featureIds: z.array(featureFilterIdSchema).optional(),
  sortMode: z.enum(["default", "nearby"]).optional(),
  updatedAt: isoTimestampSchema,
});

const mapProgressToastSchema = z.object({
  lastShownAt: isoTimestampSchema.optional(),
  dismissedAt: isoTimestampSchema.optional(),
  updatedAt: isoTimestampSchema,
});

const uiStateSchema = z.object({
  mapProgressToast: mapProgressToastSchema.optional(),
});

export const userStateSchema = z.object({
  schemaVersion: z.literal(USER_STATE_SCHEMA_VERSION),
  deviceId: z.string().min(1),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  visited: z.record(z.string(), visitedEntrySchema),
  interested: z.record(z.string(), interestedEntrySchema),
  stamps: z.record(z.string(), stampEntrySchema),
  lastFilters: lastFiltersSchema.optional(),
  ui: uiStateSchema.optional(),
});

const getNowIso = (): string => new Date().toISOString();

const createDeviceId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `device-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

export const createEmptyUserState = (
  now = getNowIso(),
  deviceId = createDeviceId(),
): YumeguriUserState => ({
  schemaVersion: USER_STATE_SCHEMA_VERSION,
  deviceId,
  createdAt: now,
  updatedAt: now,
  visited: {},
  interested: {},
  stamps: {},
});

export const parseUserState = (
  rawValue: string | null,
): YumeguriUserState | undefined => {
  if (!rawValue) return undefined;

  try {
    const parsedJson: unknown = JSON.parse(rawValue);
    const parsedState = userStateSchema.safeParse(parsedJson);

    return parsedState.success ? parsedState.data : undefined;
  } catch {
    return undefined;
  }
};

export const serializeUserState = (state: YumeguriUserState): string =>
  JSON.stringify(userStateSchema.parse(state));

const getBrowserStorage = (): UserStateStorage | undefined => {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

export const loadUserState = (
  storage = getBrowserStorage(),
): YumeguriUserState => {
  let storedValue: string | null = null;

  try {
    storedValue = storage?.getItem(USER_STATE_STORAGE_KEY) ?? null;
  } catch {
    storedValue = null;
  }

  const storedState = parseUserState(storedValue);

  return storedState ?? createEmptyUserState();
};

export const saveUserState = (
  state: YumeguriUserState,
  storage = getBrowserStorage(),
): boolean => {
  if (!storage) return false;

  try {
    storage.setItem(USER_STATE_STORAGE_KEY, serializeUserState(state));
    return true;
  } catch {
    return false;
  }
};

export const hasStoredUserState = (storage = getBrowserStorage()): boolean => {
  try {
    return storage?.getItem(USER_STATE_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

export const clearUserState = (storage = getBrowserStorage()): boolean => {
  if (!storage) return false;

  try {
    storage.removeItem(USER_STATE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};

export const markSpaVisited = (
  state: YumeguriUserState,
  spaId: string,
  now = getNowIso(),
): YumeguriUserState => setSpaVisited(state, spaId, true, now);

export const setSpaVisited = (
  state: YumeguriUserState,
  spaId: string,
  value: boolean,
  now = getNowIso(),
): YumeguriUserState => {
  const currentEntry = state.visited[spaId];

  return {
    ...state,
    updatedAt: now,
    visited: {
      ...state.visited,
      [spaId]: {
        value,
        visitedAt: value ? (currentEntry?.visitedAt ?? now) : undefined,
        updatedAt: now,
      },
    },
  };
};

export const setSpaInterested = (
  state: YumeguriUserState,
  spaId: string,
  value: boolean,
  now = getNowIso(),
): YumeguriUserState => ({
  ...state,
  updatedAt: now,
  interested: {
    ...state.interested,
    [spaId]: {
      value,
      updatedAt: now,
    },
  },
});

export const earnStamp = (
  state: YumeguriUserState,
  stampId: string,
  now = getNowIso(),
): YumeguriUserState => {
  if (state.stamps[stampId]) return state;

  return {
    ...state,
    updatedAt: now,
    stamps: {
      ...state.stamps,
      [stampId]: {
        state: "pending",
        earnedAt: now,
        updatedAt: now,
      },
    },
  };
};

export const revealStamp = (
  state: YumeguriUserState,
  stampId: string,
  now = getNowIso(),
): YumeguriUserState => {
  const currentStamp = state.stamps[stampId];
  if (!currentStamp || currentStamp.state === "revealed") return state;

  return {
    ...state,
    updatedAt: now,
    stamps: {
      ...state.stamps,
      [stampId]: {
        ...currentStamp,
        state: "revealed",
        revealedAt: now,
        updatedAt: now,
      },
    },
  };
};

export const setLastFilters = (
  state: YumeguriUserState,
  filters: Omit<UserStateLastFilters, "updatedAt">,
  now = getNowIso(),
): YumeguriUserState => ({
  ...state,
  updatedAt: now,
  lastFilters: {
    ...filters,
    updatedAt: now,
  },
});

export const shouldShowMapProgressToast = (state: YumeguriUserState): boolean =>
  !state.ui?.mapProgressToast?.dismissedAt;

export const markMapProgressToastShown = (
  state: YumeguriUserState,
  now = getNowIso(),
): YumeguriUserState => ({
  ...state,
  updatedAt: now,
  ui: {
    ...state.ui,
    mapProgressToast: {
      ...state.ui?.mapProgressToast,
      lastShownAt: now,
      updatedAt: now,
    },
  },
});

export const dismissMapProgressToast = (
  state: YumeguriUserState,
  now = getNowIso(),
): YumeguriUserState => ({
  ...state,
  updatedAt: now,
  ui: {
    ...state.ui,
    mapProgressToast: {
      ...state.ui?.mapProgressToast,
      lastShownAt: state.ui?.mapProgressToast?.lastShownAt ?? now,
      dismissedAt: now,
      updatedAt: now,
    },
  },
});

const compareIso = (a: string, b: string): number =>
  new Date(a).getTime() - new Date(b).getTime();

const getNewerEntry = <Entry extends { updatedAt: string }>(
  currentEntry: Entry | undefined,
  incomingEntry: Entry,
): Entry =>
  !currentEntry ||
  compareIso(currentEntry.updatedAt, incomingEntry.updatedAt) < 0
    ? incomingEntry
    : currentEntry;

const mergeTimestampedRecords = <Entry extends { updatedAt: string }>(
  currentRecord: Record<string, Entry>,
  incomingRecord: Record<string, Entry>,
): Record<string, Entry> => {
  const mergedRecord = { ...currentRecord };

  Object.entries(incomingRecord).forEach(([id, incomingEntry]) => {
    mergedRecord[id] = getNewerEntry(mergedRecord[id], incomingEntry);
  });

  return mergedRecord;
};

const mergeStampEntry = (
  currentStamp: UserStateStampEntry | undefined,
  incomingStamp: UserStateStampEntry,
): UserStateStampEntry => {
  if (!currentStamp) return incomingStamp;

  if (currentStamp.state === "revealed" || incomingStamp.state === "revealed") {
    const revealedStamp =
      currentStamp.state === "revealed" ? currentStamp : incomingStamp;
    const otherStamp =
      currentStamp.state === "revealed" ? incomingStamp : currentStamp;

    return {
      ...revealedStamp,
      earnedAt:
        compareIso(revealedStamp.earnedAt, otherStamp.earnedAt) <= 0
          ? revealedStamp.earnedAt
          : otherStamp.earnedAt,
      updatedAt:
        compareIso(revealedStamp.updatedAt, otherStamp.updatedAt) >= 0
          ? revealedStamp.updatedAt
          : otherStamp.updatedAt,
    };
  }

  return getNewerEntry(currentStamp, incomingStamp);
};

const mergeStampRecords = (
  currentRecord: Record<string, UserStateStampEntry>,
  incomingRecord: Record<string, UserStateStampEntry>,
): Record<string, UserStateStampEntry> => {
  const mergedRecord = { ...currentRecord };

  Object.entries(incomingRecord).forEach(([stampId, incomingStamp]) => {
    mergedRecord[stampId] = mergeStampEntry(
      mergedRecord[stampId],
      incomingStamp,
    );
  });

  return mergedRecord;
};

const mergeUiStates = (
  currentUi: UserStateUi | undefined,
  incomingUi: UserStateUi | undefined,
): UserStateUi | undefined => {
  if (!currentUi) return incomingUi;
  if (!incomingUi) return currentUi;

  return {
    mapProgressToast:
      currentUi.mapProgressToast && incomingUi.mapProgressToast
        ? getNewerEntry(currentUi.mapProgressToast, incomingUi.mapProgressToast)
        : (currentUi.mapProgressToast ?? incomingUi.mapProgressToast),
  };
};

export const mergeUserStates = (
  currentState: YumeguriUserState,
  incomingState: YumeguriUserState,
  now = getNowIso(),
): YumeguriUserState => {
  const currentLastFilters = currentState.lastFilters;
  const incomingLastFilters = incomingState.lastFilters;

  return {
    ...currentState,
    createdAt:
      compareIso(currentState.createdAt, incomingState.createdAt) <= 0
        ? currentState.createdAt
        : incomingState.createdAt,
    updatedAt: now,
    visited: mergeTimestampedRecords(
      currentState.visited,
      incomingState.visited,
    ),
    interested: mergeTimestampedRecords(
      currentState.interested,
      incomingState.interested,
    ),
    stamps: mergeStampRecords(currentState.stamps, incomingState.stamps),
    lastFilters:
      currentLastFilters && incomingLastFilters
        ? getNewerEntry(currentLastFilters, incomingLastFilters)
        : (currentLastFilters ?? incomingLastFilters),
    ui: mergeUiStates(currentState.ui, incomingState.ui),
  };
};
