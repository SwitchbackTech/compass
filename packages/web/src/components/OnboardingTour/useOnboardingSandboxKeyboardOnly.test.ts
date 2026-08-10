import { act, renderHook, waitFor } from "@testing-library/react";
import {
  initialOnboardingTourState,
  useOnboardingTourStore,
} from "@web/components/OnboardingTour/onboarding.tour.store";
import { useOnboardingSandboxKeyboardOnly } from "@web/components/OnboardingTour/useOnboardingSandboxKeyboardOnly";
import {
  initialKeyboardOnlyState,
  selectKeyboardOnlyActive,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import { beforeEach, describe, expect, it } from "bun:test";

const isKeyboardOnlyActive = () =>
  selectKeyboardOnlyActive(useKeyboardOnlyStore.getState());

beforeEach(() => {
  useOnboardingTourStore.setState({ ...initialOnboardingTourState });
  useKeyboardOnlyStore.setState({ ...initialKeyboardOnlyState });
});

describe("useOnboardingSandboxKeyboardOnly", () => {
  it("enters keyboard-only mode on a sandbox step and exits on a non-sandbox step", async () => {
    useOnboardingTourStore.setState({ isActive: true, stepId: "create" });
    renderHook(() => useOnboardingSandboxKeyboardOnly());

    expect(isKeyboardOnlyActive()).toBe(false);

    act(() => {
      useOnboardingTourStore.setState({ stepId: "moveFocus" });
    });
    await waitFor(() => expect(isKeyboardOnlyActive()).toBe(true));

    act(() => {
      useOnboardingTourStore.setState({ stepId: "palette" });
    });
    await waitFor(() => expect(isKeyboardOnlyActive()).toBe(false));
  });

  it("exits on tour skip (isActive -> false) from a sandbox step", async () => {
    useOnboardingTourStore.setState({ isActive: true, stepId: "nudge" });
    renderHook(() => useOnboardingSandboxKeyboardOnly());
    await waitFor(() => expect(isKeyboardOnlyActive()).toBe(true));

    act(() => {
      useOnboardingTourStore.setState({ ...initialOnboardingTourState });
    });
    await waitFor(() => expect(isKeyboardOnlyActive()).toBe(false));
  });

  it("exits on the fork exit path (targetEvent step change, e.g. after fork)", async () => {
    useOnboardingTourStore.setState({ isActive: true, stepId: "targetEvent" });
    renderHook(() => useOnboardingSandboxKeyboardOnly());
    await waitFor(() => expect(isKeyboardOnlyActive()).toBe(true));

    act(() => {
      useOnboardingTourStore.setState({ stepId: "undo" });
    });
    await waitFor(() => expect(isKeyboardOnlyActive()).toBe(false));
  });

  it("exits on unmount while a sandbox step is active (covers Escape/skip and browser back)", async () => {
    useOnboardingTourStore.setState({ isActive: true, stepId: "editSequence" });
    const { unmount } = renderHook(() => useOnboardingSandboxKeyboardOnly());
    await waitFor(() => expect(isKeyboardOnlyActive()).toBe(true));

    unmount();
    expect(isKeyboardOnlyActive()).toBe(false);
  });

  it("never enters keyboard-only mode for non-sandbox steps", async () => {
    useOnboardingTourStore.setState({ isActive: true, stepId: "save" });
    renderHook(() => useOnboardingSandboxKeyboardOnly());

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(isKeyboardOnlyActive()).toBe(false);
  });
});
