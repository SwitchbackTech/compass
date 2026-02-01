/**
 * @jest-environment jsdom
 */
import { session } from "@web/common/classes/Session";
import {
  clearAllBrowserStorage,
  hasCompassStorage,
} from "./browser.cleanup.util";

// Mock the session
jest.mock("@web/common/classes/Session", () => ({
  session: {
    signOut: jest.fn(),
  },
}));

describe("browser.cleanup.util", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe("hasCompassStorage", () => {
    it("should return false when no Compass storage exists", () => {
      expect(hasCompassStorage()).toBe(false);
    });

    it("should return true when compass. keys exist", () => {
      localStorage.setItem("compass.test", "value");
      expect(hasCompassStorage()).toBe(true);
    });

    it("should return true when compass.today.tasks keys exist", () => {
      localStorage.setItem("compass.today.tasks.2024-01-01", "[]");
      expect(hasCompassStorage()).toBe(true);
    });

    it("should return false for non-Compass keys", () => {
      localStorage.setItem("other.key", "value");
      expect(hasCompassStorage()).toBe(false);
    });
  });

  describe("clearAllBrowserStorage", () => {
    it("should sign out from session", async () => {
      await clearAllBrowserStorage();
      expect(session.signOut).toHaveBeenCalledTimes(1);
    });

    it("should clear all compass. localStorage keys", async () => {
      localStorage.setItem("compass.test1", "value1");
      localStorage.setItem("compass.test2", "value2");
      localStorage.setItem("other.key", "value3");

      await clearAllBrowserStorage();

      expect(localStorage.getItem("compass.test1")).toBeNull();
      expect(localStorage.getItem("compass.test2")).toBeNull();
      expect(localStorage.getItem("other.key")).toBe("value3");
    });

    it("should clear compass.today.tasks localStorage keys", async () => {
      localStorage.setItem("compass.today.tasks.2024-01-01", "[]");
      localStorage.setItem("compass.today.tasks.2024-01-02", "[]");
      localStorage.setItem("other.key", "value");

      await clearAllBrowserStorage();

      expect(localStorage.getItem("compass.today.tasks.2024-01-01")).toBeNull();
      expect(localStorage.getItem("compass.today.tasks.2024-01-02")).toBeNull();
      expect(localStorage.getItem("other.key")).toBe("value");
    });

    it("should handle errors gracefully", async () => {
      const mockSignOut = session.signOut as jest.Mock;
      mockSignOut.mockRejectedValueOnce(new Error("Sign out failed"));

      await expect(clearAllBrowserStorage()).rejects.toThrow("Sign out failed");
    });

    it("should not fail when no Compass storage exists", async () => {
      localStorage.setItem("other.key", "value");
      await expect(clearAllBrowserStorage()).resolves.not.toThrow();
      expect(localStorage.getItem("other.key")).toBe("value");
    });
  });
});
