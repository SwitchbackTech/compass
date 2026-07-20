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

  it("keeps the existing GitHub feedback links without PostHog", () => {
    const [section] = getMoreCommandPaletteSections("week", false);

    expect(section.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "report-bug",
          href: expect.stringContaining("issues/new"),
          target: "_blank",
        }),
        expect.objectContaining({
          id: "share-feedback",
          href: expect.stringContaining("discussions"),
          target: "_blank",
        }),
      ]),
    );
    expect(getCommandPalettePlaceholder("day")).toContain("bug");
    expect(getCommandPalettePlaceholder("week")).toContain("feedback");
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
