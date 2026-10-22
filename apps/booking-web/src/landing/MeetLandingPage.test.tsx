import {
  MEET_LANDING_CTA_LABEL,
  MEET_LANDING_DOCUMENT_TITLE,
  MEET_LANDING_HEADLINE,
} from "@booking-web/landing/meet-landing.copy";
import { routeTree } from "@booking-web/routers/router.routes";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen } from "@testing-library/react";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { afterAll, afterEach, describe, expect, it, mock } from "bun:test";

const mockTrack = mock();
const actualTrack = { ...(await import("@web/auth/posthog/track")) };
let isTrackMocked = true;
mock.module("@web/auth/posthog/track", () => ({
  ...actualTrack,
  track: (...args: Parameters<typeof actualTrack.track>) =>
    isTrackMocked ? mockTrack(...args) : actualTrack.track(...args),
}));

afterAll(() => {
  isTrackMocked = false;
});

afterEach(() => {
  mockTrack.mockClear();
});

function renderBookingRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPendingMs: 0,
  });
  const { wrapper } = createStoreWrapper();
  return render(
    <HotkeysProvider>
      <RouterProvider router={router} />
    </HotkeysProvider>,
    { wrapper },
  );
}

describe("MeetLandingPage", () => {
  it("renders the landing page on bare /meet with one page shell", async () => {
    const { rerender } = renderBookingRoute("/meet");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: MEET_LANDING_HEADLINE,
      }),
    ).toBeInTheDocument();
    expect(document.title).toBe(`${MEET_LANDING_DOCUMENT_TITLE} - Compass`);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Set up your own meeting page" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/7-day trial/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Already use Compass/i)).not.toBeInTheDocument();

    expect(
      mockTrack.mock.calls.filter(
        (call) => call[0] === "booking_landing_viewed",
      ),
    ).toHaveLength(1);
    rerender(<div />);
    expect(
      mockTrack.mock.calls.filter(
        (call) => call[0] === "booking_landing_viewed",
      ),
    ).toHaveLength(1);
  });

  it("renders the landing page on /meet/ too", async () => {
    renderBookingRoute("/meet/");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: MEET_LANDING_HEADLINE,
      }),
    ).toBeInTheDocument();
  });

  it("sends the setup CTA to guest meeting setup with landing source", async () => {
    renderBookingRoute("/meet");
    await screen.findByRole("heading", {
      level: 1,
      name: MEET_LANDING_HEADLINE,
    });

    const cta = screen.getByRole("link", { name: MEET_LANDING_CTA_LABEL });
    expect(cta).toHaveAttribute("href", "/?meetingSetup=1");
    fireEvent.click(cta);
    expect(mockTrack).toHaveBeenCalledWith("booking_setup_cta_clicked", {
      source: "landing",
    });
  });
});
