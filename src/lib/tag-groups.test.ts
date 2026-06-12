import { describe, expect, it } from "vitest";
import { getSpaTagGroups } from "./tag-groups";

describe("getSpaTagGroups", () => {
  it("returns grouped tags in decision order", () => {
    const groups = getSpaTagGroups({
      tags: ["天然温泉", "サウナ", "食事処", "駅近"],
      tagGroups: {
        food: ["食事処"],
        bath: ["天然温泉"],
        sauna: ["サウナ"],
        other: ["駅近"],
      },
    });

    expect(groups).toEqual([
      { key: "bath", label: "お風呂", tags: ["天然温泉"] },
      { key: "sauna", label: "サウナ", tags: ["有り"] },
      { key: "food", label: "食事", tags: ["有り"] },
      { key: "other", label: "その他", tags: ["駅近"] },
    ]);
  });

  it("shows availability for sauna and food when structured groups exist", () => {
    expect(
      getSpaTagGroups({
        tags: ["天然温泉"],
        tagGroups: {
          bath: ["天然温泉"],
        },
      }),
    ).toEqual([
      { key: "bath", label: "お風呂", tags: ["天然温泉"] },
      { key: "sauna", label: "サウナ", tags: ["無し"] },
      { key: "food", label: "食事", tags: ["無し"] },
    ]);
  });

  it("falls back to legacy tags when no groups exist", () => {
    expect(
      getSpaTagGroups({ tags: ["露天風呂"], tagGroups: undefined }),
    ).toEqual([{ key: "general", label: "特徴", tags: ["露天風呂"] }]);
  });
});
