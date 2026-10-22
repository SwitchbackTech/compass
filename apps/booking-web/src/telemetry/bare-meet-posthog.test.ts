import {
  isBareMeetPathname,
  wireBareMeetLandingTelemetry,
} from "@booking-web/telemetry/bare-meet-posthog";
import { afterEach, describe, expect, it, mock } from "bun:test";

const capture = mock();

afterEach(() => {
  capture.mockClear();
});

describe("isBareMeetPathname", () => {
  it("matches bare /meet paths only", () => {
    expect(isBareMeetPathname("/meet")).toBe(true);
    expect(isBareMeetPathname("/meet/")).toBe(true);
    expect(isBareMeetPathname("/meet/host")).toBe(false);
  });
});

describe("wireBareMeetLandingTelemetry", () => {
  it("captures landing viewed and setup CTA clicks on bare /meet", () => {
    const client = { capture };
    window.history.pushState({}, "", "/meet");
    wireBareMeetLandingTelemetry(client as never);

    expect(capture).toHaveBeenCalledWith("booking_landing_viewed");

    const link = document.createElement("a");
    link.href = "/?meetingSetup=1";
    link.textContent = "Set up";
    document.body.append(link);
    link.click();

    expect(capture).toHaveBeenCalledWith("booking_setup_cta_clicked", {
      source: "landing",
    });
    link.remove();
  });
});
