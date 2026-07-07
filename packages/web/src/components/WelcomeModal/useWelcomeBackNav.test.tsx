import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useWelcomeBackNav } from "./useWelcomeBackNav";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const closeAuthModal = mock();
const onBackToWelcome = mock();

function renderBackNav() {
  return renderHook(
    ({ isAuthModalOpen }: { isAuthModalOpen: boolean }) =>
      useWelcomeBackNav({ isAuthModalOpen, closeAuthModal, onBackToWelcome }),
    { initialProps: { isAuthModalOpen: false } },
  );
}

function pressBack() {
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
  });
}

describe("useWelcomeBackNav", () => {
  let pushStateSpy: ReturnType<typeof spyOn<History, "pushState">>;
  let backSpy: ReturnType<typeof spyOn<History, "back">>;

  beforeEach(() => {
    closeAuthModal.mockClear();
    onBackToWelcome.mockClear();
    window.history.replaceState(null, "", window.location.href);
    pushStateSpy = spyOn(window.history, "pushState");
    backSpy = spyOn(window.history, "back").mockImplementation(() => {});
  });

  afterEach(() => {
    pushStateSpy.mockRestore();
    backSpy.mockRestore();
  });

  it("pushes a flagged history entry when handing off to the auth modal", () => {
    const { result } = renderBackNav();

    act(() => {
      result.current.pushAuthEntry();
    });

    expect(pushStateSpy).toHaveBeenCalledWith(
      { compassAuthFromWelcome: true },
      "",
      window.location.href,
    );
  });

  it("closes the auth modal and returns to welcome on back press", () => {
    const { result, rerender } = renderBackNav();

    act(() => {
      result.current.pushAuthEntry();
    });
    rerender({ isAuthModalOpen: true });

    pressBack();

    expect(closeAuthModal).toHaveBeenCalledTimes(1);
    expect(onBackToWelcome).toHaveBeenCalledTimes(1);

    // A later back press (welcome already restored) does nothing more
    pressBack();
    expect(closeAuthModal).toHaveBeenCalledTimes(1);
    expect(onBackToWelcome).toHaveBeenCalledTimes(1);
  });

  it("ignores back presses when the auth modal was not opened from welcome", () => {
    const { rerender } = renderBackNav();

    rerender({ isAuthModalOpen: true });
    pressBack();

    expect(closeAuthModal).not.toHaveBeenCalled();
    expect(onBackToWelcome).not.toHaveBeenCalled();
  });

  it("silently consumes the stale entry when the auth modal closes without a back press", () => {
    const { result, rerender } = renderBackNav();

    act(() => {
      result.current.pushAuthEntry();
    });
    rerender({ isAuthModalOpen: true });

    // Close via Escape/backdrop/login success instead of a back press
    rerender({ isAuthModalOpen: false });

    expect(backSpy).toHaveBeenCalledTimes(1);

    // The popstate caused by the programmatic back() is swallowed
    pressBack();
    expect(closeAuthModal).not.toHaveBeenCalled();
    expect(onBackToWelcome).not.toHaveBeenCalled();
  });

  it("does not call history.back when the auth modal was closed by a back press", () => {
    const { result, rerender } = renderBackNav();

    act(() => {
      result.current.pushAuthEntry();
    });
    rerender({ isAuthModalOpen: true });

    pressBack();
    rerender({ isAuthModalOpen: false });

    expect(backSpy).not.toHaveBeenCalled();
  });
});
