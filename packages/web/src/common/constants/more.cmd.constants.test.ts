import {
  getCommandPalettePlaceholder,
  getMoreCommandPaletteSections,
} from "@web/common/constants/more.cmd.constants";
import {
  feedbackActions,
  selectFeedbackRequest,
  useFeedbackStore,
} from "@web/components/Feedback/feedback.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("getMoreCommandPaletteSections", () => {
  beforeEach(feedbackActions.close);

  it("omits feedback commands when PostHog is not enabled", () => {
    const [section] = getMoreCommandPaletteSections("week", false);

    expect(section.items).toHaveLength(1);
    expect(section.items[0].label).toMatch(/^Version: /);
    expect(getCommandPalettePlaceholder("day", false)).not.toContain("bug");
    expect(getCommandPalettePlaceholder("week", false)).not.toContain(
      "feedback",
    );
  });

  it("opens a prefilled feedback request from each cloud command", () => {
    const [section] = getMoreCommandPaletteSections("day", true);
    const reportBug = section.items.find((item) => item.id === "report-bug");
    const shareFeedback = section.items.find(
      (item) => item.id === "share-feedback",
    );

    reportBug?.onClick?.();
    expect(selectFeedbackRequest(useFeedbackStore.getState())).toEqual({
      kind: "bug",
      view: "day",
    });

    shareFeedback?.onClick?.();
    expect(selectFeedbackRequest(useFeedbackStore.getState())).toEqual({
      kind: "suggestion",
      view: "day",
    });
  });
});
