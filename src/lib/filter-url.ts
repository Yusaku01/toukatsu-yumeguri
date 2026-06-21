import { isFeatureFilterId, type FeatureFilterId } from "./filters";

export const CITY_SLUGS = {
  松戸市: "matsudo",
  柏市: "kashiwa",
  流山市: "nagareyama",
  我孫子市: "abiko",
  野田市: "noda",
  鎌ケ谷市: "kamagaya",
  吉川市: "yoshikawa",
  江戸川区: "edogawa",
  佐倉市: "sakura",
  市川市: "ichikawa",
  千葉市: "chiba",
  船橋市: "funabashi",
} as const;

const cityEntries = Object.entries(CITY_SLUGS);

export const getCitySlug = (city: string): string =>
  CITY_SLUGS[city as keyof typeof CITY_SLUGS] ?? city;

export const getCityFromSlug = (slug: string): string | undefined =>
  cityEntries.find(([, citySlug]) => citySlug === slug)?.[0];

export const getValidFeatureIdsFromParam = (
  value: string | null,
): FeatureFilterId[] =>
  (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(isFeatureFilterId);

export const getFeatureIdsFromSearchParams = (
  searchParams: URLSearchParams,
): FeatureFilterId[] =>
  getValidFeatureIdsFromParam(
    searchParams.get("features") ?? searchParams.get("tags"),
  );

export const getSpaIdFromSearchParams = (
  searchParams: URLSearchParams,
  validSpaIds: Iterable<string>,
): string | undefined => {
  const spaId = searchParams.get("spa")?.trim();
  if (!spaId) return undefined;

  return new Set(validSpaIds).has(spaId) ? spaId : undefined;
};
