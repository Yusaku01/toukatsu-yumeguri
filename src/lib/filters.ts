import type { Spa } from "./types";

export type FeatureFilterId =
  | "sauna"
  | "onsen"
  | "ganbanyoku"
  | "food"
  | "station";

export type FeatureFilter = {
  id: FeatureFilterId;
  label: string;
  match: (spa: Spa) => boolean;
};

const getAllTags = (spa: Spa): string[] => [
  ...spa.tags,
  ...Object.values(spa.tagGroups ?? {}).flat(),
];

const hasTag = (spa: Spa, tag: string): boolean =>
  getAllTags(spa).includes(tag);

export const featureFilters: FeatureFilter[] = [
  {
    id: "sauna",
    label: "サウナ",
    match: (spa) =>
      spa.tagGroups
        ? (spa.tagGroups.sauna?.length ?? 0) > 0
        : hasTag(spa, "サウナ"),
  },
  {
    id: "onsen",
    label: "天然温泉",
    match: (spa) => hasTag(spa, "天然温泉"),
  },
  {
    id: "ganbanyoku",
    label: "岩盤浴",
    match: (spa) => hasTag(spa, "岩盤浴"),
  },
  {
    id: "food",
    label: "食事処",
    match: (spa) =>
      spa.tagGroups
        ? (spa.tagGroups.food?.length ?? 0) > 0
        : hasTag(spa, "食事処"),
  },
  {
    id: "station",
    label: "駅近",
    match: (spa) => hasTag(spa, "駅近"),
  },
];

export const featureFilterIds = featureFilters.map((filter) => filter.id);

export const isFeatureFilterId = (value: string): value is FeatureFilterId =>
  featureFilterIds.includes(value as FeatureFilterId);

export const spaMatchesFeatureFilters = (
  spa: Spa,
  activeFeatureIds: Iterable<string>,
): boolean => {
  const filters = [...activeFeatureIds]
    .filter(isFeatureFilterId)
    .map((id) => featureFilters.find((filter) => filter.id === id))
    .filter((filter): filter is FeatureFilter => Boolean(filter));

  return filters.every((filter) => filter.match(spa));
};

export const getFeatureFilterCounts = (
  spas: Spa[],
): Array<FeatureFilter & { count: number }> =>
  featureFilters.map((filter) => ({
    ...filter,
    count: spas.filter((spa) => filter.match(spa)).length,
  }));
