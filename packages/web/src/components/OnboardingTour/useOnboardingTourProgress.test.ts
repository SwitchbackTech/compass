import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  initialOnboardingTourState,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import {
  shouldAdvancePaletteStep,
  useOnboardingTourProgress,
} from "@web/components/OnboardingTour/useOnboardingTourProgress";
import {
  initialViewState,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import {
  initialSettingsState,
  settingsActions,
  useSettingsStore,
} from "@web/settings/settings.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("shouldAdvancePaletteStep", () => {
  it("does not advance when the palette has only opened", () => {
    expect(
      shouldAdvancePaletteStep({
        paletteOpened: true,
        isPaletteOpen: true,
        isShortcutsOpen: false,
      }),
    ).toBe(false);
  });

  it("advances after the palette was opened and then closed", () => {
    expect(
      shouldAdvancePaletteStep({
        paletteOpened: true,
        isPaletteOpen: false,
        isShortcutsOpen: false,
      }),
    ).toBe(true);
  });

  it("does not advance before the palette has ever opened", () => {
    expect(
      shouldAdvancePaletteStep({
        paletteOpened: false,
        isPaletteOpen: false,
        isShortcutsOpen: false,
      }),
    ).toBe(false);
  });

  it("advances when shortcuts open from inside the palette", () => {
    expect(
      shouldAdvancePaletteStep({
        paletteOpened: true,
        isPaletteOpen: true,
        isShortcutsOpen: true,
      }),
    ).toBe(true);
  });
});

describe("useOnboardingTourProgress palette step", () => {
  beforeEach(() => {
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "palette",
    });
    useSettingsStore.setState(initialSettingsState);
    useViewStore.setState(initialViewState);
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR, "");
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: new QueryClient() }, children);

  it("stays on palette while the command palette is open", async () => {
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      settingsActions.openCmdPalette();
    });

    await waitFor(() => {
      expect(useSettingsStore.getState().isCmdPaletteOpen).toBe(true);
    });
    expect(useOnboardingTourStore.getState().stepId).toBe("palette");
  });

  it("advances to shortcuts after the palette opens then closes", async () => {
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      settingsActions.openCmdPalette();
    });
    act(() => {
      settingsActions.closeCmdPalette();
    });

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("shortcuts");
    });
  });

  it("skips ahead when shortcuts open from the palette", async () => {
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      settingsActions.openCmdPalette();
      viewActions.toggleShortcuts();
    });

    await waitFor(() => {
      // Palette advance + shortcuts already-open cascade lands on done.
      expect(useOnboardingTourStore.getState().stepId).toBe("done");
    });
  });
});
