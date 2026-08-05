import {
  getCommandPalettePlaceholder,
  getMoreCommandPaletteSections,
} from "@web/components/CommandPalette/more.cmd.constants";
import {
  feedbackActions,
  selectFeedbackRequest,
  useFeedbackStore,
} from "@web/components/Feedback/feedback.store";
import {
  selectIsAboutOpen,
  useSettingsStore,
} from "@web/settings/settings.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("getMoreCommandPaletteSections", () => {
  beforeEach(() => {
    feedbackActions.close();
    useSettingsStore.setState({ isAboutOpen: false });
  });

  it("omits feedback commands when PostHog is not enabled", () => {
    const [section] = getMoreCommandPaletteSections("week", false);

    expect(section.items).toHaveLength(1);
    expect(section.items[0].label).toBe("About Compass");
    expect(getCommandPalettePlaceholder("day", false)).not.toContain("bug");
    expect(getCommandPalettePlaceholder("week", false)).not.toContain(
      "feedback",
    );
  });

  it("opens the feedback request from the cloud command", () => {
    const [section] = getMoreCommandPaletteSections("day", true);
    expect(section.items).toHaveLength(2);
    expect(
      section.items.find((item) => item.id === "report-bug"),
    ).toBeUndefined();
    const shareFeedback = section.items.find(
      (item) => item.id === "share-feedback",
    );

    shareFeedback?.onClick?.();
    expect(selectFeedbackRequest(useFeedbackStore.getState())).toEqual({
      view: "day",
    });
    expect(getCommandPalettePlaceholder("day", true)).toContain("feedback");
    expect(getCommandPalettePlaceholder("day", true)).not.toContain("bug");
  });

  it("offers feedback from Life", () => {
    const [section] = getMoreCommandPaletteSections("life", true);
    section.items.find((item) => item.id === "share-feedback")?.onClick?.();

    expect(selectFeedbackRequest(useFeedbackStore.getState())).toEqual({
      view: "life",
    });
    expect(getCommandPalettePlaceholder("life", true)).toBe(
      "Try: 'day', 'week', or 'feedback'",
    );
  });

  it("opens the About modal from the about command", () => {
    const [section] = getMoreCommandPaletteSections("week", false);
    const about = section.items.find((item) => item.id === "about");

    about?.onClick?.();

    expect(selectIsAboutOpen(useSettingsStore.getState())).toBe(true);
  });
});
