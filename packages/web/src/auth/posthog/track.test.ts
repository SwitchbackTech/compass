import { afterAll, describe, expect, it, mock } from "bun:test";

const capture = mock();
let client: { capture: typeof capture } | undefined = { capture };

// bun's mock.module is global and leaks into every other test file in the
// run. Spread the real module so unrelated suites still see its full
// surface, and only override getPosthogClient while this file runs - the
// flag flips back to the real implementation in afterAll.
const actualPosthogBootstrap = {
  ...(await import("@web/auth/posthog/posthog.bootstrap")),
};
let isClientMocked = true;

mock.module("@web/auth/posthog/posthog.bootstrap", () => ({
  ...actualPosthogBootstrap,
  getPosthogClient: () =>
    isClientMocked ? client : actualPosthogBootstrap.getPosthogClient(),
}));

afterAll(() => {
  isClientMocked = false;
});

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
