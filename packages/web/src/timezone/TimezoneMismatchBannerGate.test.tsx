import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  getPinnedTimeZone,
  resetEffectiveTimeZoneStoreForTests,
  setBrowserTimeZoneForTests,
  setPinnedTimeZone,
} from "@web/timezone/effective-timezone.store";
import { TimezoneMismatchBannerGate } from "@web/timezone/TimezoneMismatchBannerGate";
import { timezoneMismatchCopy } from "@web/timezone/timezone-mismatch";
import { afterEach, describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";

afterEach(() => {
  cleanup();
  act(() => {
    resetEffectiveTimeZoneStoreForTests();
  });
});

describe("TimezoneMismatchBannerGate", () => {
  it("does not render in Auto", () => {
    render(<TimezoneMismatchBannerGate />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not render when the pin matches the browser", () => {
    act(() => {
      setBrowserTimeZoneForTests("America/Denver");
      setPinnedTimeZone("America/Denver");
    });

    render(<TimezoneMismatchBannerGate />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("prompts to switch or keep when the pin differs from the browser", () => {
    act(() => {
      setBrowserTimeZoneForTests("America/Denver");
      setPinnedTimeZone("America/New_York");
    });

    const copy = timezoneMismatchCopy("America/Denver", "America/New_York");
    render(<TimezoneMismatchBannerGate />);

    expect(screen.getByRole("status")).toHaveTextContent(copy.message);
    expect(
      screen.getByRole("button", { name: copy.switchLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.keepLabel }),
    ).toBeInTheDocument();
  });

  it("pins the browser zone when Switch is chosen", async () => {
    const user = userEvent.setup();
    act(() => {
      setBrowserTimeZoneForTests("America/Denver");
      setPinnedTimeZone("America/New_York");
    });

    const copy = timezoneMismatchCopy("America/Denver", "America/New_York");
    render(<TimezoneMismatchBannerGate />);
    await user.click(screen.getByRole("button", { name: copy.switchLabel }));

    expect(getPinnedTimeZone()).toBe("America/Denver");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("snoozes until the browser zone changes when Keep is chosen", async () => {
    const user = userEvent.setup();
    act(() => {
      setBrowserTimeZoneForTests("America/Denver");
      setPinnedTimeZone("America/New_York");
    });

    const denverCopy = timezoneMismatchCopy(
      "America/Denver",
      "America/New_York",
    );
    const { unmount } = render(<TimezoneMismatchBannerGate />);
    await user.click(
      screen.getByRole("button", { name: denverCopy.keepLabel }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    unmount();
    render(<TimezoneMismatchBannerGate />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      setBrowserTimeZoneForTests("America/Chicago");
    });
    const chicagoCopy = timezoneMismatchCopy(
      "America/Chicago",
      "America/New_York",
    );
    expect(screen.getByRole("status")).toHaveTextContent(chicagoCopy.message);
  });
});
