import { renderHook } from "@testing-library/react";
import { useAuthUrlParam } from "./useAuthUrlParam";

// Helper to set up window.location for tests
const setWindowLocation = (url: string) => {
  const urlObj = new URL(url, "http://localhost");
  Object.defineProperty(window, "location", {
    value: {
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
    },
    writable: true,
  });
};

// Mock history.replaceState
const mockReplaceState = jest.fn();
Object.defineProperty(window, "history", {
  value: {
    replaceState: mockReplaceState,
  },
  writable: true,
});

describe("useAuthUrlParam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default location
    setWindowLocation("/");
  });

  describe("opens modal for valid param values", () => {
    it("opens login view for ?auth=login", () => {
      setWindowLocation("/?auth=login");
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith("login");
      expect(openModal).toHaveBeenCalledTimes(1);
    });

    it("opens signUp view for ?auth=signup", () => {
      setWindowLocation("/?auth=signup");
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith("signUp");
      expect(openModal).toHaveBeenCalledTimes(1);
    });

    it("opens forgotPassword view for ?auth=forgot", () => {
      setWindowLocation("/?auth=forgot");
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith("forgotPassword");
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
    ] as const)("handles %s as %s", (param, expectedView) => {
      setWindowLocation(`/?auth=${param}`);
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith(expectedView);
    });
  });

  describe("ignores invalid values", () => {
    it("does not open modal for invalid param value", () => {
      setWindowLocation("/?auth=invalid");
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).not.toHaveBeenCalled();
    });

    it("does not open modal for empty param value", () => {
      setWindowLocation("/?auth=");
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).not.toHaveBeenCalled();
    });

    it("does not open modal when no auth param present", () => {
      setWindowLocation("/");
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).not.toHaveBeenCalled();
    });
  });

  describe("clears param after opening", () => {
    it("removes auth param from URL", () => {
      setWindowLocation("/?auth=login");
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(mockReplaceState).toHaveBeenCalledWith(null, "", "/");
    });

    it("preserves other query params", () => {
      setWindowLocation("/?auth=login&other=value&another=param");
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(mockReplaceState).toHaveBeenCalledWith(
        null,
        "",
        "/?other=value&another=param",
      );
    });

    it("preserves hash", () => {
      setWindowLocation("/?auth=login#section");
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(mockReplaceState).toHaveBeenCalledWith(null, "", "/#section");
    });
  });

  describe("double-trigger prevention", () => {
    it("only opens modal once even when rerendered", () => {
      setWindowLocation("/?auth=login");
      const openModal = jest.fn();
      const { rerender } = renderHook(() => useAuthUrlParam(openModal));

      // Simulate StrictMode by rerendering
      rerender();
      rerender();

      expect(openModal).toHaveBeenCalledTimes(1);
    });
  });

  describe("works with different routes", () => {
    it("works on /week route", () => {
      setWindowLocation("/week?auth=signup");
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith("signUp");
      expect(mockReplaceState).toHaveBeenCalledWith(null, "", "/week");
    });

    it("works on /day route with date", () => {
      setWindowLocation("/day/2026-02-26?auth=forgot");
      const openModal = jest.fn();
      renderHook(() => useAuthUrlParam(openModal));

      expect(openModal).toHaveBeenCalledWith("forgotPassword");
      expect(mockReplaceState).toHaveBeenCalledWith(
        null,
        "",
        "/day/2026-02-26",
      );
    });
  });
});
