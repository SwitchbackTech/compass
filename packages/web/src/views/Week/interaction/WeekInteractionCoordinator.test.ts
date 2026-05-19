import { shouldReopenFormAfterNoopSavedMutation } from "./WeekInteractionCoordinator";
import { describe, expect, it } from "bun:test";

describe("shouldReopenFormAfterNoopSavedMutation", () => {
  it("does not open the form for a no-op drag that started from the closed form state", () => {
    expect(
      shouldReopenFormAfterNoopSavedMutation({
        hadFormOpenBeforeInteraction: false,
        hasMoved: false,
      }),
    ).toBe(false);
  });

  it("reopens the form after a no-op interaction if it was open before motion started", () => {
    expect(
      shouldReopenFormAfterNoopSavedMutation({
        hadFormOpenBeforeInteraction: true,
        hasMoved: false,
      }),
    ).toBe(true);
  });

  it("does not handle moved interactions as no-op form restoration", () => {
    expect(
      shouldReopenFormAfterNoopSavedMutation({
        hadFormOpenBeforeInteraction: true,
        hasMoved: true,
      }),
    ).toBe(false);
  });
});
