import { act, renderHook, waitFor } from "@testing-library/react";
import { createUseLifeViewIntro } from "@web/views/Life/useLifeViewIntro";
import { beforeEach, describe, expect, it, mock } from "bun:test";

describe("useLifeViewIntro", () => {
  const markSeenLocally = mock();
  const persistSeenOnServer = mock(() => Promise.resolve());
  const trackEvent = mock();

  beforeEach(() => {
    markSeenLocally.mockClear();
    persistSeenOnServer.mockClear();
    trackEvent.mockClear();
  });

  const buildHook = (overrides?: {
    authenticated?: boolean;
    metadata?: { onboarding?: { lifeViewIntroSeenAt?: string } } | null;
    metadataStatus?: "idle" | "loading" | "loaded";
    seenLocally?: boolean;
  }) =>
    createUseLifeViewIntro({
      useSession: () => ({
        authenticated: overrides?.authenticated ?? false,
      }),
      useMetadata: () => ({
        metadata: overrides?.metadata ?? null,
        status: overrides?.metadataStatus ?? "idle",
      }),
      hasSeenLocally: () => overrides?.seenLocally ?? false,
      markSeenLocally,
      readSeenFromMetadata: (metadata) =>
        Boolean(metadata?.onboarding?.lifeViewIntroSeenAt),
      persistSeenOnServer,
      trackEvent,
    });

  it("mounts for anonymous users immediately", () => {
    const useLifeViewIntro = buildHook();
    const { result } = renderHook(() => useLifeViewIntro());
    expect(result.current.mounted).toBe(true);
    expect(trackEvent).toHaveBeenCalledWith("life_view_intro_shown");
  });

  it("waits for metadata before showing signed-in users", () => {
    const useLifeViewIntro = buildHook({
      authenticated: true,
      metadataStatus: "loading",
    });
    const { result } = renderHook(() => useLifeViewIntro());
    expect(result.current.mounted).toBe(false);
  });

  it("does not mount when already seen locally", () => {
    const useLifeViewIntro = buildHook({ seenLocally: true });
    const { result } = renderHook(() => useLifeViewIntro());
    expect(result.current.mounted).toBe(false);
  });

  it("does not mount when metadata already records the intro as seen", () => {
    const useLifeViewIntro = buildHook({
      authenticated: true,
      metadataStatus: "loaded",
      metadata: {
        onboarding: { lifeViewIntroSeenAt: "2026-01-01T00:00:00.000Z" },
      },
    });
    const { result } = renderHook(() => useLifeViewIntro());
    expect(result.current.mounted).toBe(false);
    expect(markSeenLocally).toHaveBeenCalled();
  });

  it("persists locally and on the server when dismissed", async () => {
    const useLifeViewIntro = buildHook({
      authenticated: true,
      metadataStatus: "loaded",
    });
    const { result } = renderHook(() => useLifeViewIntro());

    act(() => {
      result.current.dismiss("primary");
    });

    await waitFor(() => {
      expect(result.current.mounted).toBe(false);
    });

    expect(markSeenLocally).toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith("life_view_intro_dismissed", {
      cta: "primary",
    });
    expect(persistSeenOnServer).toHaveBeenCalled();
  });
});
