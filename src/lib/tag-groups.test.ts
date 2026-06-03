import { describe, expect, it } from "vitest";
import { getSpaTagGroups } from "./tag-groups";

describe("getSpaTagGroups", () => {
  it("returns grouped tags in decision order", () => {
    const groups = getSpaTagGroups({
      tags: ["天然温泉", "食事処", "駅近"],
      tagGroups: {
        food: ["食事処"],
        bath: ["天然温泉"],
        access: ["駅近"],
      },
    });

    expect(groups).toEqual([
      { key: "bath", label: "お風呂", tags: ["天然温泉"] },
      { key: "access", label: "行きやすさ", tags: ["駅近"] },
      { key: "food", label: "食事", tags: ["食事処"] },
    ]);
  });

  it("falls back to legacy tags when no groups exist", () => {
    expect(
      getSpaTagGroups({ tags: ["露天風呂"], tagGroups: undefined }),
    ).toEqual([{ key: "general", label: "特徴", tags: ["露天風呂"] }]);
  });
});
