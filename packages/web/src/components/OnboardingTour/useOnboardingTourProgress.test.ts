import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { EventIdSchema } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { DEMO_EVENT_IDS } from "@web/common/storage/migrations/external/demo-data-seed";
import {
  initialOnboardingTourState,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import {
  shouldAdvanceTargetEventStep,
  useOnboardingTourProgress,
} from "@web/components/OnboardingTour/useOnboardingTourProgress";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import {
  initialDraftState,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  edgeFocusActions,
  initialEdgeFocusState,
  useEdgeFocusStore,
} from "@web/grid/shortcuts/edge-focus.store";
import {
  initialKeyboardOnlyState,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

// Every test in this file renders useOnboardingTourProgress, which attaches
// document-level keydown/focusin listeners for as long as it stays mounted.
// Without an explicit unmount, a leaked listener from one test can react to
// key/focus events dispatched by a later test and desync shared global
// stores (tour/draft/edge-focus/keyboard-only) - a prior version of this
// file hung on exactly that cross-test pollution.
afterEach(cleanup);

const DENTIST_WEEK_KEY = eventQueryKeys.week({
  source: "local",
  start: "2026-05-01T00:00:00.000Z",
  end: "2026-05-08T00:00:00.000Z",
});

const dentistEvent = (start: string, end: string) =>
  createMockEvent({
    id: EventIdSchema.parse(DEMO_EVENT_IDS.dentist),
    schedule: EventScheduleSchema.parse({
      kind: "timed",
      start,
      end,
      timeZone: "America/Chicago",
    }),
  });

const seedDentist = (
  client: QueryClient,
  start = "2026-05-05T14:30:00.000-05:00",
  end = "2026-05-05T15:30:00.000-05:00",
) => {
  const event = dentistEvent(start, end);
  client.setQueryData(DENTIST_WEEK_KEY, {
    ids: [event.id],
    entities: { [event.id]: event },
  });
  return event;
};

describe("shouldAdvanceTargetEventStep", () => {
  it("advances only for the Dentist demo event, named directly in the mission", () => {
    expect(shouldAdvanceTargetEventStep(DEMO_EVENT_IDS.dentist)).toBe(true);
    expect(shouldAdvanceTargetEventStep(DEMO_EVENT_IDS.teamSync)).toBe(false);
    expect(shouldAdvanceTargetEventStep(DEMO_EVENT_IDS.morningStandup)).toBe(
      false,
    );
    expect(shouldAdvanceTargetEventStep(null)).toBe(false);
  });
});

describe("useOnboardingTourProgress mission verification", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    useOnboardingTourStore.setState(initialOnboardingTourState);
    useDraftStore.setState(initialDraftState);
    useEdgeFocusStore.setState(initialEdgeFocusState);
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState);
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR, "");
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

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

  it("targetEvent: advances only when the Dentist event itself receives focus", async () => {
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "targetEvent",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    const decoy = document.createElement("div");
    decoy.setAttribute(
      "data-week-interaction-event-id",
      DEMO_EVENT_IDS.teamSync,
    );
    decoy.tabIndex = 0;
    document.body.appendChild(decoy);
    decoy.focus();
    expect(useOnboardingTourStore.getState().stepId).toBe("targetEvent");
    decoy.remove();

    const dentist = document.createElement("div");
    dentist.setAttribute(
      "data-week-interaction-event-id",
      DEMO_EVENT_IDS.dentist,
    );
    dentist.tabIndex = 0;
    document.body.appendChild(dentist);
    dentist.focus();

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("move");
    });
    dentist.remove();
  });

  it("move: advances only once Dentist's start time actually changes", async () => {
    seedDentist(queryClient);
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "move",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    // A re-render with the same schedule must not count as a move.
    act(() => {
      seedDentist(queryClient);
    });
    expect(useOnboardingTourStore.getState().stepId).toBe("move");

    act(() => {
      seedDentist(
        queryClient,
        "2026-05-05T16:00:00.000-05:00",
        "2026-05-05T17:00:00.000-05:00",
      );
    });

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("resizeEdge");
    });
  });

  it("resizeEdge: a single real Tab (as the card promises) reaches the end edge", async () => {
    seedDentist(queryClient);
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "resizeEdge",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    // The step must seed edge focus to startDate on entry - EDGE_CYCLE is
    // [null, startDate, endDate], and nothing before this step touches edge
    // focus, so without a startDate seed a single real Tab cycle would land
    // on startDate, contradicting the card's single-Tab copy/shortcutHint.
    expect(useEdgeFocusStore.getState().edge).toBe("startDate");

    act(() => {
      edgeFocusActions.cycle(DEMO_EVENT_IDS.dentist, "forward");
    });
    expect(useEdgeFocusStore.getState().edge).toBe("endDate");
  });

  it("resizeEdge: requires the end edge focused AND only the end time to move", async () => {
    seedDentist(queryClient);
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "resizeEdge",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    // End time moving before the user Tabs off startDate (the step's seeded
    // edge) must not count as a resize.
    expect(useEdgeFocusStore.getState().edge).toBe("startDate");
    act(() => {
      seedDentist(
        queryClient,
        "2026-05-05T14:30:00.000-05:00",
        "2026-05-05T16:00:00.000-05:00",
      );
    });
    expect(useOnboardingTourStore.getState().stepId).toBe("resizeEdge");

    act(() => {
      // A single real Tab cycle from the step's seeded startDate.
      edgeFocusActions.cycle(DEMO_EVENT_IDS.dentist, "forward");
      seedDentist(
        queryClient,
        "2026-05-05T14:30:00.000-05:00",
        "2026-05-05T17:00:00.000-05:00",
      );
    });

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("placeDraft");
    });
  });

  it("placeDraft: advances once a Shift+Arrow keyboard-placed draft lands, and discards it", async () => {
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "placeDraft",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      useDraftStore.setState({
        gridDraft: { clientId: "draft-1" } as never,
        status: {
          activity: "keyboardPlace",
          isDrafting: true,
          isFormOpen: false,
        },
      });
    });

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("undo");
    });
    expect(useDraftStore.getState().gridDraft).toBeNull();
  });

  it("undo: requires a revert then a reapply of Dentist's schedule, not just Mod+Z keydowns", async () => {
    seedDentist(
      queryClient,
      "2026-05-05T16:00:00.000-05:00",
      "2026-05-05T17:00:00.000-05:00",
    );
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "undo",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    // Pressing the key alone, with no state change, must not advance.
    act(() => {
      dispatchKey("z", { metaKey: true });
    });
    expect(useOnboardingTourStore.getState().stepId).toBe("undo");

    // Phase 1: the revert.
    act(() => {
      seedDentist(
        queryClient,
        "2026-05-05T14:30:00.000-05:00",
        "2026-05-05T15:30:00.000-05:00",
      );
    });
    expect(useOnboardingTourStore.getState().stepId).toBe("undo");

    // Phase 2: the reapply.
    act(() => {
      seedDentist(
        queryClient,
        "2026-05-05T16:00:00.000-05:00",
        "2026-05-05T17:00:00.000-05:00",
      );
    });

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("hardcore");
    });
  });

  it("hardcore: advances (and finishes the tour) once Hardcore Mode is actually active", async () => {
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "hardcore",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    expect(useOnboardingTourStore.getState().isActive).toBe(true);

    act(() => {
      useKeyboardOnlyStore.setState({ isActive: true });
    });

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().isActive).toBe(false);
    });
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_ONBOARDING_TOUR),
    ).toBe("true");
  });
});

describe("useOnboardingTourProgress navigation and Escape", () => {
  beforeEach(() => {
    useOnboardingTourStore.setState(initialOnboardingTourState);
    useDraftStore.setState(initialDraftState);
    useEdgeFocusStore.setState(initialEdgeFocusState);
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState);
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

  it("shows a skip confirm on Escape instead of skipping immediately", async () => {
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
      expect(useOnboardingTourStore.getState().isConfirmingSkip).toBe(true);
    });
    expect(useOnboardingTourStore.getState().isActive).toBe(true);
  });

  it("skips the tour when Enter confirms the skip", async () => {
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "create",
      isConfirmingSkip: true,
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      dispatchKey("Enter");
    });

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().isActive).toBe(false);
    });
  });

  it("cancels the skip confirm and keeps the tour going on any other key", async () => {
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "create",
      isConfirmingSkip: true,
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      dispatchKey("a");
    });

    expect(useOnboardingTourStore.getState().isConfirmingSkip).toBe(false);
    expect(useOnboardingTourStore.getState().isActive).toBe(true);
  });

  it("advances and retreats with ArrowRight and ArrowLeft outside arrow lessons", async () => {
    useOnboardingTourStore.setState({
      ...initialOnboardingTourState,
      isActive: true,
      stepId: "undo",
    });
    renderHook(() => useOnboardingTourProgress(), { wrapper });

    act(() => {
      dispatchKey("ArrowRight");
    });
    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("hardcore");
    });

    act(() => {
      dispatchKey("ArrowLeft");
    });
    await waitFor(() => {
      expect(useOnboardingTourStore.getState().stepId).toBe("undo");
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

    // Arrow-lesson steps disable nav arrows entirely; a plain ArrowRight
    // keydown with nothing focused must not fake-complete the lesson.
    expect(useOnboardingTourStore.getState().stepId).toBe("moveFocus");
  });
});
