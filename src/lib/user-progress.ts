import { getCitySlug } from "./filter-url";
import type { Spa } from "./types";
import {
  earnStamp,
  type YumeguriUserState,
  type UserStateVisitedEntry,
} from "./user-state";

export type YumeguriProgress = {
  scopeKey: string;
  scopeLabel: string;
  visitedCount: number;
  totalCount: number;
  remainingCount: number;
  percentage: number;
  isComplete: boolean;
};

const getVisitedSpaIds = (
  visited: Record<string, UserStateVisitedEntry>,
): Set<string> =>
  new Set(
    Object.entries(visited)
      .filter(([, entry]) => entry.value)
      .map(([spaId]) => spaId),
  );

const getDisplayScopeLabel = (activeCity: string): string =>
  activeCity === "all" ? "東葛" : activeCity.replace(/市$/, "");

const getScopeKey = (activeCity: string): string =>
  activeCity === "all" ? "all" : `city:${getCitySlug(activeCity)}`;

export const calculateYumeguriProgress = (
  spas: Spa[],
  state: YumeguriUserState,
  activeCity: string,
): YumeguriProgress => {
  const scopeSpas =
    activeCity === "all" ? spas : spas.filter((spa) => spa.city === activeCity);
  const visitedSpaIds = getVisitedSpaIds(state.visited);
  const visitedCount = scopeSpas.filter((spa) => visitedSpaIds.has(spa.id))
    .length;
  const totalCount = scopeSpas.length;
  const percentage =
    totalCount === 0 ? 0 : Math.round((visitedCount / totalCount) * 100);

  return {
    scopeKey: getScopeKey(activeCity),
    scopeLabel: getDisplayScopeLabel(activeCity),
    visitedCount,
    totalCount,
    remainingCount: Math.max(0, totalCount - visitedCount),
    percentage,
    isComplete: totalCount > 0 && visitedCount === totalCount,
  };
};

export const getYumeguriProgressCopy = (progress: YumeguriProgress): string => {
  if (progress.totalCount === 0) return "該当なし";
  if (progress.isComplete) return "制覇";
  if (progress.visitedCount === 0) return "未訪問";

  return `あと${progress.remainingCount}件`;
};

export const syncCompletionStamps = (
  state: YumeguriUserState,
  spas: Spa[],
  now?: string,
): YumeguriUserState => {
  let nextState = state;
  const visitedSpaIds = getVisitedSpaIds(state.visited);

  spas.forEach((spa) => {
    if (visitedSpaIds.has(spa.id)) {
      nextState = earnStamp(nextState, `visit:${spa.id}`, now);
    }
  });

  const cityNames = new Set(spas.map((spa) => spa.city));
  cityNames.forEach((city) => {
    const citySpas = spas.filter((spa) => spa.city === city);
    const isCityComplete =
      citySpas.length > 0 && citySpas.every((spa) => visitedSpaIds.has(spa.id));

    if (isCityComplete) {
      nextState = earnStamp(nextState, `city:${getCitySlug(city)}:complete`, now);
    }
  });

  const isAllComplete =
    spas.length > 0 && spas.every((spa) => visitedSpaIds.has(spa.id));
  if (isAllComplete) {
    nextState = earnStamp(nextState, "all:complete", now);
  }

  return nextState;
};
