import { renderHook } from "@testing-library/react";
import { setTestWindowUrl } from "@web/__tests__/set-test-window-url";
import { useAuthUrlParam } from "./useAuthUrlParam";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const originalReplaceState = window.history.replaceState.bind(window.history);
const replaceStateSpy = spyOn(window.history, "replaceState");

describe("useAuthUrlParam", () => {
  beforeEach(() => {
    replaceStateSpy.mockClear();
    replaceStateSpy.mockImplementation((data, title, url) => {
      originalReplaceState(data, title, url as string | URL | null);
    });
    // Reset to default location
    setTestWindowUrl("/");
  });

  describe("opens modal for valid param values", () => {
    it("opens login view for ?auth=login", () => {
      setTestWindowUrl("/?auth=login");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith("login");
      expect(openModal).toHaveBeenCalledTimes(1);
    });

    it("opens signUp view for ?auth=signup", () => {
      setTestWindowUrl("/?auth=signup");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith("signUp");
      expect(openModal).toHaveBeenCalledTimes(1);
    });

    it("opens forgotPassword view for ?auth=forgot", () => {
      setTestWindowUrl("/?auth=forgot");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith("forgotPassword");
      expect(openModal).toHaveBeenCalledTimes(1);
    });

    it("opens resetPassword view for ?auth=reset", () => {
      setTestWindowUrl("/?auth=reset&token=test-token");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith("resetPassword");
      expect(openModal).toHaveBeenCalledTimes(1);
    });
  });

  describe("case-insensitive handling", () => {
    it.each([
      ["LOGIN", "login"],
      ["Login", "login"],
      ["SIGNUP", "signUp"],
      ["SignUp", "signUp"],
      ["FORGOT", "forgotPassword"],
      ["Forgot", "forgotPassword"],
      ["RESET", "resetPassword"],
      ["Reset", "resetPassword"],
    ] as const)("handles %s as %s", (param, expectedView) => {
      setTestWindowUrl(`/?auth=${param}`);
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith(expectedView);
    });
  });

  describe("ignores invalid values", () => {
    it("does not open modal for invalid param value", () => {
      setTestWindowUrl("/?auth=invalid");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).not.toHaveBeenCalled();
    });

    it("does not open modal for empty param value", () => {
      setTestWindowUrl("/?auth=");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).not.toHaveBeenCalled();
    });

    it("does not open modal when no auth param present", () => {
      setTestWindowUrl("/");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).not.toHaveBeenCalled();
    });
  });

  describe("clears param after opening", () => {
    it("removes auth param from URL", () => {
      setTestWindowUrl("/?auth=login");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/");
    });

    it("preserves other query params", () => {
      setTestWindowUrl("/?auth=login&other=value&another=param");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(replaceStateSpy).toHaveBeenCalledWith(
        null,
        "",
        "/?other=value&another=param",
      );
    });

    it("preserves hash", () => {
      setTestWindowUrl("/?auth=login#section");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/#section");
    });
  });

  describe("double-trigger prevention", () => {
    it("only opens modal once even when rerendered", () => {
      setTestWindowUrl("/?auth=login");
      const openModal = mock();
      const { rerender } = renderHook(() => useAuthUrlParam(openModal));

      // Simulate StrictMode by rerendering
      rerender();
      rerender();

      expect(openModal).toHaveBeenCalledTimes(1);
    });
  });

  describe("works with different routes", () => {
    it("works on /week route", () => {
      setTestWindowUrl("/week?auth=signup");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith("signUp");
      expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/week");
    });

    it("works on /day route with date", () => {
      setTestWindowUrl("/day/2026-02-26?auth=forgot");
      const openModal = mock();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith("forgotPassword");
      expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/day/2026-02-26");
    });
  });
});

afterAll(() => {
  mock.restore();
});
