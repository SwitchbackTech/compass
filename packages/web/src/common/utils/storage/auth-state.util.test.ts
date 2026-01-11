import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  clearAuthenticationState,
  hasUserEverAuthenticated,
  markUserAsAuthenticated,
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

  describe("markUserAsAuthenticated", () => {
    it("should set the authentication flag in localStorage", () => {
      markUserAsAuthenticated();

      const value = localStorage.getItem(STORAGE_KEYS.HAS_AUTHENTICATED);
      expect(value).toBe("true");
    });

    it("should handle localStorage errors gracefully", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const setItemSpy = jest
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("Storage quota exceeded");
        });

      // Should not throw
      expect(() => markUserAsAuthenticated()).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Auth State] Failed to mark user as authenticated:",
        expect.any(Error),
      );

      setItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("hasUserEverAuthenticated", () => {
    it("should return true when authentication flag is set", () => {
      localStorage.setItem(STORAGE_KEYS.HAS_AUTHENTICATED, "true");

      expect(hasUserEverAuthenticated()).toBe(true);
    });

    it("should return false when authentication flag is not set", () => {
      expect(hasUserEverAuthenticated()).toBe(false);
    });

    it("should return false when authentication flag is set to something other than 'true'", () => {
      localStorage.setItem(STORAGE_KEYS.HAS_AUTHENTICATED, "false");

      expect(hasUserEverAuthenticated()).toBe(false);
    });

    it("should handle localStorage errors gracefully and return false", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const getItemSpy = jest
        .spyOn(Storage.prototype, "getItem")
        .mockImplementation(() => {
          throw new Error("localStorage not available");
        });

      const result = hasUserEverAuthenticated();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Auth State] Failed to check authentication state:",
        expect.any(Error),
      );

      getItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("clearAuthenticationState", () => {
    it("should remove the authentication flag from localStorage", () => {
      localStorage.setItem(STORAGE_KEYS.HAS_AUTHENTICATED, "true");

      clearAuthenticationState();

      const value = localStorage.getItem(STORAGE_KEYS.HAS_AUTHENTICATED);
      expect(value).toBeNull();
    });

    it("should handle localStorage errors gracefully", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const removeItemSpy = jest
        .spyOn(Storage.prototype, "removeItem")
        .mockImplementation(() => {
          throw new Error("localStorage not available");
        });

      // Should not throw
      expect(() => clearAuthenticationState()).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Auth State] Failed to clear authentication state:",
        expect.any(Error),
      );

      removeItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
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
