import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  hasSeenLifeViewIntroLocally,
  markLifeViewIntroSeenLocally,
  readLifeViewIntroSeenFromMetadata,
} from "@web/views/Life/life-view-intro.util";
import { describe, expect, it } from "bun:test";

describe("life view intro storage", () => {
  it("starts unseen and stays seen after markLifeViewIntroSeenLocally", () => {
    localStorage.clear();
    expect(hasSeenLifeViewIntroLocally()).toBe(false);
    markLifeViewIntroSeenLocally();
    expect(hasSeenLifeViewIntroLocally()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_LIFE_VIEW_INTRO)).toBe(
      "true",
    );
  });

  it("reads server metadata flag", () => {
    expect(readLifeViewIntroSeenFromMetadata(null)).toBe(false);
    expect(readLifeViewIntroSeenFromMetadata({})).toBe(false);
    expect(
      readLifeViewIntroSeenFromMetadata({
        onboarding: { lifeViewIntroSeenAt: "2026-01-01T00:00:00.000Z" },
      }),
    ).toBe(true);
  });
});
