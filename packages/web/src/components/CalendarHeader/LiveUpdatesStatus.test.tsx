import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";
import { mockModuleForFile } from "@web/__tests__/utils/mock-module.test.util";
import * as realBrowserNavigation from "@web/common/utils/browser/browser-navigation.util";
import * as realUseSseDegraded from "@web/sse/hooks/useSseDegraded";

let degradedSinceMs: number | null = null;
let isDegradedMocked = true;
const actualUseSseDegradedSince = realUseSseDegraded.useSseDegradedSince;
mockModuleForFile("@web/sse/hooks/useSseDegraded", realUseSseDegraded, {
  useSseDegradedSince: () =>
    isDegradedMocked ? degradedSinceMs : actualUseSseDegradedSince(),
});

const reloadLocation = mock();
mockModuleForFile(
  "@web/common/utils/browser/browser-navigation.util",
  realBrowserNavigation,
  { reloadLocation },
);

afterAll(() => {
  isDegradedMocked = false;
});

// Cache-bust so this file's mocks apply even when another suite already
// loaded the component with the real hooks.
const moduleUrl = new URL(
  `./LiveUpdatesStatus.tsx?test=${Math.random().toString(36).slice(2)}`,
  import.meta.url,
);
const { LiveUpdatesStatus, REFRESH_AFTER_DEGRADED_MS } = (await import(
  moduleUrl.href
)) as typeof import("./LiveUpdatesStatus");

describe("LiveUpdatesStatus", () => {
  afterEach(() => {
    degradedSinceMs = null;
    reloadLocation.mockClear();
  });

  it("renders nothing while the stream is healthy", () => {
    render(<LiveUpdatesStatus />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the reconnecting badge without a refresh control at first", () => {
    degradedSinceMs = Date.now();
    render(<LiveUpdatesStatus />);

    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting…");
    expect(
      screen.queryByRole("button", { name: "Refresh" }),
    ).not.toBeInTheDocument();
  });

  it("offers a reload once the outage has outlived the refresh window", async () => {
    const user = userEvent.setup();
    degradedSinceMs = Date.now() - REFRESH_AFTER_DEGRADED_MS - 1_000;
    render(<LiveUpdatesStatus />);

    const refresh = screen.getByRole("button", { name: "Refresh" });
    await user.hover(refresh);
    const tooltip = await screen.findByRole("tooltip");
    expect(
      within(tooltip).getByText("Reload for the latest calendar"),
    ).toBeInTheDocument();
    expect(within(tooltip).getByText("R")).toBeInTheDocument();

    // Bare focus() opens the tooltip outside React's act; wrap it.
    act(() => refresh.focus());
    await user.keyboard("{Enter}");
    expect(reloadLocation).toHaveBeenCalledTimes(1);
  });

  it("adds the refresh control when the remaining window elapses", async () => {
    degradedSinceMs = Date.now() - REFRESH_AFTER_DEGRADED_MS + 50;
    render(<LiveUpdatesStatus />);

    expect(
      screen.queryByRole("button", { name: "Refresh" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Refresh" }),
    ).toBeInTheDocument();
  });

  it("clears the badge when the stream reopens", () => {
    degradedSinceMs = Date.now() - REFRESH_AFTER_DEGRADED_MS - 1_000;
    const { rerender } = render(<LiveUpdatesStatus />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    degradedSinceMs = null;
    rerender(<LiveUpdatesStatus />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Refresh" }),
    ).not.toBeInTheDocument();
  });
});
