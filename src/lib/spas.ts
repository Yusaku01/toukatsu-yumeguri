import { getCollection } from "astro:content";
import {
  getCityCounts as getOrderedCityCounts,
  getOrderedCities,
  sortSpasForDisplay,
} from "./sort";
import type { Spa } from "./types";

export const getSpas = async (): Promise<Spa[]> => {
  const entries = await getCollection("spas");
  const spas = entries.map((entry) => entry.data);
  return sortSpasForDisplay(spas);
};

export const getCities = (spas: Spa[]): string[] => getOrderedCities(spas);

export const getCityCounts = (
  spas: Spa[],
): Array<{
  city: string;
  count: number;
}> => getOrderedCityCounts(spas);
