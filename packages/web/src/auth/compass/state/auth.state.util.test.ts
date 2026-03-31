import { DEFAULT_AUTH_STATE } from "@web/common/constants/auth.constants";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  clearGoogleRevokedState,
  isGoogleRevoked,
  markGoogleAsRevoked,
} from "../../google/state/google.auth.state";
import {
  clearAnonymousCalendarChangeSignUpPrompt,
  clearAuthenticationState,
  getAuthState,
  getLastKnownEmail,
  hasUserEverAuthenticated,
  markAnonymousCalendarChangeForSignUpPrompt,
  markUserAsAuthenticated,
  shouldShowAnonymousCalendarChangeSignUpPrompt,
  subscribeToAuthState,
  updateAuthState,
} from "./auth.state.util";

describe("auth-state.util", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear in-memory revoked state
    clearGoogleRevokedState();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
    clearGoogleRevokedState();
  });

  describe("getAuthState", () => {
    it("should return default state when no data exists", () => {
      const state = getAuthState();
      expect(state).toEqual(DEFAULT_AUTH_STATE);
    });

    it("should return stored state from localStorage", () => {
      const testState = { hasAuthenticated: true };
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(testState));

      const state = getAuthState();
      expect(state).toEqual({
        hasAuthenticated: true,
        shouldPromptSignUpAfterAnonymousCalendarChange: false,
      });
    });

    it("should migrate legacy stored state from isGoogleAuthenticated", () => {
      localStorage.setItem(
        STORAGE_KEYS.AUTH,
        JSON.stringify({ isGoogleAuthenticated: true }),
      );

      expect(getAuthState()).toEqual({
        hasAuthenticated: true,
        shouldPromptSignUpAfterAnonymousCalendarChange: false,
      });
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
      updateAuthState({ hasAuthenticated: true });

      const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
      expect(stored).toBeTruthy();
      const parsed: unknown = JSON.parse(stored ?? "{}");
      expect(typeof parsed).toBe("object");
      expect(parsed).not.toBeNull();
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Expected parsed auth state to be an object");
      }
      expect(parsed.hasAuthenticated).toBe(true);
    });

    it("should merge partial updates into existing state", () => {
      updateAuthState({ hasAuthenticated: true });
      updateAuthState({ hasAuthenticated: false });

      const state = getAuthState();
      expect(state.hasAuthenticated).toBe(false);
    });

    it("should store the last known email", () => {
      updateAuthState({
        hasAuthenticated: true,
        lastKnownEmail: "foo@bar.com",
      });

      expect(getAuthState()).toEqual({
        hasAuthenticated: true,
        lastKnownEmail: "foo@bar.com",
        shouldPromptSignUpAfterAnonymousCalendarChange: false,
      });
    });

    it("should handle localStorage errors gracefully", () => {
      const setItemSpy = jest
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("Storage quota exceeded");
        });

      // Should not throw
      expect(() => updateAuthState({ hasAuthenticated: true })).not.toThrow();

      setItemSpy.mockRestore();
    });
  });

  describe("markUserAsAuthenticated", () => {
    it("should set the authentication flag in localStorage", () => {
      markUserAsAuthenticated();

      const state = getAuthState();
      expect(state.hasAuthenticated).toBe(true);
    });

    it("should persist the provided email", () => {
      markUserAsAuthenticated("foo@bar.com");

      expect(getLastKnownEmail()).toBe("foo@bar.com");
    });

    it("should preserve the existing email when no new email is provided", () => {
      markUserAsAuthenticated("foo@bar.com");
      markUserAsAuthenticated();

      expect(getLastKnownEmail()).toBe("foo@bar.com");
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

  describe("anonymous calendar sign-up prompt", () => {
    it("defaults the prompt flag to false for legacy state", () => {
      localStorage.setItem(
        STORAGE_KEYS.AUTH,
        JSON.stringify({ hasAuthenticated: false }),
      );

      expect(shouldShowAnonymousCalendarChangeSignUpPrompt()).toBe(false);
    });

    it("marks and clears the prompt flag", () => {
      markAnonymousCalendarChangeForSignUpPrompt();
      expect(shouldShowAnonymousCalendarChangeSignUpPrompt()).toBe(true);

      clearAnonymousCalendarChangeSignUpPrompt();
      expect(shouldShowAnonymousCalendarChangeSignUpPrompt()).toBe(false);
    });

    it("notifies subscribers when auth state changes", () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToAuthState(listener);

      markAnonymousCalendarChangeForSignUpPrompt();
      clearAnonymousCalendarChangeSignUpPrompt();

      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
    });
  });

  describe("hasUserEverAuthenticated", () => {
    it("should return true when authentication flag is set", () => {
      updateAuthState({ hasAuthenticated: true });

      expect(hasUserEverAuthenticated()).toBe(true);
    });

    it("should return false when authentication flag is not set", () => {
      expect(hasUserEverAuthenticated()).toBe(false);
    });

    it("should return false when authentication flag is set to false", () => {
      updateAuthState({ hasAuthenticated: false });

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

  describe("markUserAsAuthenticated with revoked state", () => {
    it("should clear revoked flag when re-authenticating", () => {
      markGoogleAsRevoked();
      expect(isGoogleRevoked()).toBe(true);

      markUserAsAuthenticated();

      expect(isGoogleRevoked()).toBe(false);
      expect(hasUserEverAuthenticated()).toBe(true);
    });
  });

  describe("clearAuthenticationState", () => {
    it("should remove the authentication flag from localStorage", () => {
      updateAuthState({ hasAuthenticated: true });

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

    it("should keep revoked state separate from localStorage auth state", () => {
      markUserAsAuthenticated();
      markGoogleAsRevoked();

      // Auth state in localStorage should be unchanged
      const state = getAuthState();
      expect(state.hasAuthenticated).toBe(true);
      // Revoked state is in-memory only, not in localStorage
      expect(isGoogleRevoked()).toBe(true);
    });
  });
});
