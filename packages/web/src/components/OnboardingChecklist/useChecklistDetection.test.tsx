import { act, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  initialChecklistState,
  useChecklistStore,
} from "@web/components/OnboardingChecklist/checklist.store";
import { useChecklistDetection } from "@web/components/OnboardingChecklist/useChecklistDetection";
import {
  edgeFocusActions,
  initialEdgeFocusState,
  useEdgeFocusStore,
} from "@web/grid/shortcuts/edge-focus.store";
import {
  eventJumpActions,
  initialEventJumpState,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const wrapperFor =
  (authenticated: boolean) =>
  ({ children }: { children: ReactNode }) => (
    <SessionContext.Provider
      value={{ authenticated, setAuthenticated: () => {} }}
    >
      {children}
    </SessionContext.Provider>
  );

const pressKey = (key: string, init: KeyboardEventInit = {}) => {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, ...init }),
    );
  });
};

const completed = () => useChecklistStore.getState().completed;

describe("useChecklistDetection", () => {
  const resetStores = () => {
    useChecklistStore.setState({ ...initialChecklistState });
    useEventJumpStore.setState(initialEventJumpState);
    useEdgeFocusStore.setState(initialEdgeFocusState);
  };

  beforeEach(() => {
    resetStores();
    persistentBrowserStore.set(STORAGE_KEYS.CHECKLIST_PROGRESS, "");
    persistentBrowserStore.set(STORAGE_KEYS.CHECKLIST_DONE, "");
  });

  // These stores are module-level singletons shared across the whole bun
  // process; leaving event-jump "active" here leaks into unrelated suites.
  afterEach(resetStores);

  it("credits jumpToEvent when the S jump mode activates", () => {
    renderHook(() => useChecklistDetection(true), {
      wrapper: wrapperFor(false),
    });
    act(() => eventJumpActions.setActive(true));
    expect(completed().jumpToEvent).toBe(true);
  });

  it("credits undo on Mod+Z but not Mod+Shift+Z", () => {
    renderHook(() => useChecklistDetection(true), {
      wrapper: wrapperFor(false),
    });
    pressKey("z", { metaKey: true, shiftKey: true });
    expect(completed().undo).toBeUndefined();
    pressKey("z", { metaKey: true });
    expect(completed().undo).toBe(true);
  });

  it("credits resizeEdge for Shift+Arrow while an edge is focused", () => {
    renderHook(() => useChecklistDetection(true), {
      wrapper: wrapperFor(false),
    });
    pressKey("ArrowDown", { shiftKey: true });
    expect(completed().resizeEdge).toBeUndefined();

    act(() =>
      edgeFocusActions.setEdge("some-event", "endDate", "Editing end time"),
    );
    pressKey("ArrowDown", { shiftKey: true });
    expect(completed().resizeEdge).toBe(true);
  });

  it("credits signUp when the session is already authenticated", () => {
    renderHook(() => useChecklistDetection(true), {
      wrapper: wrapperFor(true),
    });
    expect(completed().signUp).toBe(true);
  });

  it("detects nothing while disabled", () => {
    renderHook(() => useChecklistDetection(false), {
      wrapper: wrapperFor(true),
    });
    act(() => eventJumpActions.setActive(true));
    pressKey("z", { metaKey: true });
    expect(completed()).toEqual({});
  });
});
