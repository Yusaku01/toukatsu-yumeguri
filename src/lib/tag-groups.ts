import type { Spa, SpaTagGroupKey } from "./types";

const TAG_GROUP_ORDER: SpaTagGroupKey[] = [
  "bath",
  "sauna",
  "access",
  "family",
  "food",
];

export const spaTagGroupLabels: Record<SpaTagGroupKey, string> = {
  bath: "お風呂",
  sauna: "サウナ",
  access: "行きやすさ",
  family: "家族",
  food: "食事",
};

export type DisplayTagGroup = {
  key: SpaTagGroupKey | "general";
  label: string;
  tags: string[];
};

export const getSpaTagGroups = (spa: Pick<Spa, "tags" | "tagGroups">) => {
  const groups = TAG_GROUP_ORDER.flatMap((key): DisplayTagGroup[] => {
    const tags = spa.tagGroups?.[key] ?? [];
    return tags.length > 0
      ? [{ key, label: spaTagGroupLabels[key], tags }]
      : [];
  });

  if (groups.length > 0) return groups;

  return spa.tags.length > 0
    ? [{ key: "general", label: "特徴", tags: spa.tags }]
    : [];
};
