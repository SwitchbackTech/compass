import { isFeedbackEnabled } from "@web/auth/posthog/posthog.util";
import { describe, expect, it } from "bun:test";

describe("isFeedbackEnabled", () => {
  it("requires both the cloud feedback flag and PostHog configuration", () => {
    expect(isFeedbackEnabled(false, true)).toBe(false);
    expect(isFeedbackEnabled(true, false)).toBe(false);
    expect(isFeedbackEnabled(true, true)).toBe(true);
  });
});
