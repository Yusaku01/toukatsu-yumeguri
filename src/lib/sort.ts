import { getDistanceInMeters } from "./geo";
import type { Coordinates, Spa } from "./types";

export const TOKATSU_CITY_ORDER = [
  "松戸市",
  "柏市",
  "流山市",
  "我孫子市",
  "野田市",
  "鎌ケ谷市",
] as const;

const getCityRank = (city: string) => {
  const index = TOKATSU_CITY_ORDER.indexOf(
    city as (typeof TOKATSU_CITY_ORDER)[number],
  );
  return index === -1 ? TOKATSU_CITY_ORDER.length : index;
};

export const sortSpasForDisplay = (
  spas: Spa[],
  currentLocation?: Coordinates,
): Spa[] => {
  return [...spas].sort((a, b) => {
    if (currentLocation) {
      return (
        getDistanceInMeters(currentLocation, a) -
        getDistanceInMeters(currentLocation, b)
      );
    }

    return (
      getCityRank(a.city) - getCityRank(b.city) ||
      a.city.localeCompare(b.city, "ja") ||
      a.name.localeCompare(b.name, "ja")
    );
  });
};

export const getOrderedCities = (spas: Spa[]): string[] => {
  const cities = new Set(spas.map((spa) => spa.city));
  return [...cities].sort(
    (a, b) => getCityRank(a) - getCityRank(b) || a.localeCompare(b, "ja"),
  );
};
