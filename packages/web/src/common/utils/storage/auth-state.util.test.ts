import { DEFAULT_AUTH_STATE } from "@web/common/constants/auth.constants";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  clearAuthenticationState,
  getAuthState,
  hasUserEverAuthenticated,
  markUserAsAuthenticated,
  updateAuthState,
} from "./auth-state.util";

describe("auth-state.util", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe("getAuthState", () => {
    it("should return default state when no data exists", () => {
      const state = getAuthState();
      expect(state).toEqual(DEFAULT_AUTH_STATE);
    });

    it("should return stored state from localStorage", () => {
      const testState = { isGoogleAuthenticated: true };
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(testState));

      const state = getAuthState();
      expect(state).toEqual(testState);
    });

    it("should handle invalid JSON gracefully", () => {
      localStorage.setItem(STORAGE_KEYS.AUTH, "invalid json");
      const state = getAuthState();
      expect(state).toEqual(DEFAULT_AUTH_STATE);
    });

    it("should handle invalid schema gracefully", () => {
      localStorage.setItem(
        STORAGE_KEYS.AUTH,
        JSON.stringify({ invalid: "data" }),
      );
      const state = getAuthState();
      expect(state).toEqual(DEFAULT_AUTH_STATE);
    });
  });

  describe("updateAuthState", () => {
    it("should update authentication state in localStorage", () => {
      updateAuthState({ isGoogleAuthenticated: true });

      const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.isGoogleAuthenticated).toBe(true);
    });

    it("should merge partial updates into existing state", () => {
      updateAuthState({ isGoogleAuthenticated: true });
      updateAuthState({ isGoogleAuthenticated: false });

      const state = getAuthState();
      expect(state.isGoogleAuthenticated).toBe(false);
    });

    it("should handle localStorage errors gracefully", () => {
      const setItemSpy = jest
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("Storage quota exceeded");
        });

      // Should not throw
      expect(() =>
        updateAuthState({ isGoogleAuthenticated: true }),
      ).not.toThrow();

      setItemSpy.mockRestore();
    });
  });

  describe("markUserAsAuthenticated", () => {
    it("should set the authentication flag in localStorage", () => {
      markUserAsAuthenticated();

      const state = getAuthState();
      expect(state.isGoogleAuthenticated).toBe(true);
    });

    it("should handle localStorage errors gracefully", () => {
      const setItemSpy = jest
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("Storage quota exceeded");
        });

      // Should not throw
      expect(() => markUserAsAuthenticated()).not.toThrow();

      setItemSpy.mockRestore();
    });
  });

  describe("hasUserEverAuthenticated", () => {
    it("should return true when authentication flag is set", () => {
      updateAuthState({ isGoogleAuthenticated: true });

      expect(hasUserEverAuthenticated()).toBe(true);
    });

    it("should return false when authentication flag is not set", () => {
      expect(hasUserEverAuthenticated()).toBe(false);
    });

    it("should return false when authentication flag is set to false", () => {
      updateAuthState({ isGoogleAuthenticated: false });

      expect(hasUserEverAuthenticated()).toBe(false);
    });

    it("should handle localStorage errors gracefully and return false", () => {
      const getItemSpy = jest
        .spyOn(Storage.prototype, "getItem")
        .mockImplementation(() => {
          throw new Error("localStorage not available");
        });

      const result = hasUserEverAuthenticated();

      expect(result).toBe(false);

      getItemSpy.mockRestore();
    });
  });

  describe("clearAuthenticationState", () => {
    it("should remove the authentication flag from localStorage", () => {
      updateAuthState({ isGoogleAuthenticated: true });

      clearAuthenticationState();

      const value = localStorage.getItem(STORAGE_KEYS.AUTH);
      expect(value).toBeNull();
    });

    it("should handle localStorage errors gracefully", () => {
      const removeItemSpy = jest
        .spyOn(Storage.prototype, "removeItem")
        .mockImplementation(() => {
          throw new Error("localStorage not available");
        });

      // Should not throw
      expect(() => clearAuthenticationState()).not.toThrow();

      removeItemSpy.mockRestore();
    });
  });

  describe("integration tests", () => {
    it("should support full authentication lifecycle", () => {
      // Initially not authenticated
      expect(hasUserEverAuthenticated()).toBe(false);

      // Mark as authenticated
      markUserAsAuthenticated();
      expect(hasUserEverAuthenticated()).toBe(true);

      // Clear authentication state
      clearAuthenticationState();
      expect(hasUserEverAuthenticated()).toBe(false);
    });
  });
});
