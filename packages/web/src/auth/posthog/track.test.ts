import { describe, expect, it, mock } from "bun:test";

const capture = mock();
let client: { capture: typeof capture } | undefined = { capture };

mock.module("@web/auth/posthog/posthog.bootstrap", () => ({
  getPosthogClient: () => client,
}));

const { track } = await import("./track");

describe("track", () => {
  it("forwards the event name and properties to the PostHog client", () => {
    track("signup_started", { source: "welcome_modal" });

    expect(capture).toHaveBeenCalledWith("signup_started", {
      source: "welcome_modal",
    });
  });

  it("no-ops when PostHog is not initialized", () => {
    client = undefined;

    expect(() => track("event_created")).not.toThrow();
  });
});
