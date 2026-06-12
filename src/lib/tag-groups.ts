import type { Spa, SpaTagGroupKey } from "./types";

const TAG_GROUP_ORDER: SpaTagGroupKey[] = [
  "bath",
  "sauna",
  "food",
  "other",
];

export const spaTagGroupLabels: Record<SpaTagGroupKey, string> = {
  bath: "お風呂",
  sauna: "サウナ",
  food: "食事",
  other: "その他",
};

export type DisplayTagGroup = {
  key: SpaTagGroupKey | "general";
  label: string;
  tags: string[];
};

const AVAILABILITY_GROUP_KEYS = new Set<SpaTagGroupKey>(["sauna", "food"]);

export const getSpaTagGroups = (spa: Pick<Spa, "tags" | "tagGroups">) => {
  const hasStructuredGroups =
    spa.tagGroups !== undefined &&
    Object.values(spa.tagGroups).some((tags) => (tags?.length ?? 0) > 0);

  if (!hasStructuredGroups) {
    return spa.tags.length > 0
      ? [{ key: "general", label: "特徴", tags: spa.tags }]
      : [];
  }

  const groups = TAG_GROUP_ORDER.flatMap((key): DisplayTagGroup[] => {
    const tags = spa.tagGroups?.[key] ?? [];

    if (AVAILABILITY_GROUP_KEYS.has(key)) {
      return [
        {
          key,
          label: spaTagGroupLabels[key],
          tags: [tags.length > 0 ? "有り" : "無し"],
        },
      ];
    }

    return tags.length > 0
      ? [{ key, label: spaTagGroupLabels[key], tags }]
      : [];
  });

  return groups;
};
