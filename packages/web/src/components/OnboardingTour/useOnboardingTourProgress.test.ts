import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  initialOnboardingTourState,
  onboardingTourActions,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import {
  shouldAdvancePaletteStep,
  shouldAdvanceTargetEventStep,
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

  it("does not advance on shortcuts alone before the palette opened", () => {
    expect(
      shouldAdvancePaletteStep({
        paletteOpened: false,
        isPaletteOpen: false,
        isShortcutsOpen: true,
      }),
    ).toBe(false);
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
      // Palette advance + shortcuts already-open cascade lands on fork.
      expect(useOnboardingTourStore.getState().stepId).toBe("fork");
    });
  });

  it("does not skip the palette lesson when shortcuts open alone", async () => {
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      viewActions.toggleShortcuts();
    });

    await waitFor(() => {
      expect(useViewStore.getState().shortcuts.isOpen).toBe(true);
    });
    expect(useOnboardingTourStore.getState().stepId).toBe("palette");
  });
});

describe("useOnboardingTourProgress navigation and Escape", () => {
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

  const dispatchKey = (key: string, init: KeyboardEventInit = {}) => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  };

  it("skips the tour on Escape when no lesson overlay owns it", async () => {
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "create",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      dispatchKey("Escape");
    });

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().isActive).toBe(false);
    });
  });

  it("lets Escape close the open palette during the palette lesson", async () => {
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      settingsActions.openCmdPalette();
    });
    act(() => {
      dispatchKey("Escape");
    });

    expect(useOnboardingTourStore.getState().isActive).toBe(true);
    expect(useOnboardingTourStore.getState().stepId).toBe("palette");
  });

  it("advances and retreats with ArrowRight and ArrowLeft outside arrow lessons", async () => {
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "shortcuts",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      dispatchKey("ArrowRight");
    });
    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("fork");
    });

    act(() => {
      dispatchKey("ArrowLeft");
    });
    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("shortcuts");
    });
  });

  it("does not use ArrowRight as Next on moveFocus", async () => {
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "moveFocus",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      dispatchKey("ArrowRight");
    });

    // Lesson handler advances once; nav arrows are disabled so we do not skip
    // past editSequence in the same press.
    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("editSequence");
    });
  });

  it("advances targetEvent when a sandbox jump event receives focus", async () => {
    expect(shouldAdvanceTargetEventStep("sandbox-targetEvent-2")).toBe(true);
    expect(shouldAdvanceTargetEventStep("sandbox-nudge-1")).toBe(false);
    expect(shouldAdvanceTargetEventStep(null)).toBe(false);

    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "targetEvent",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      if (shouldAdvanceTargetEventStep("sandbox-targetEvent-1")) {
        onboardingTourActions.advance();
      }
    });

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("nudge");
    });
  });

  it("does not advance targetEvent on Shift alone", async () => {
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "targetEvent",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      dispatchKey("Shift");
    });

    expect(useOnboardingTourStore.getState().stepId).toBe("targetEvent");
  });
});
