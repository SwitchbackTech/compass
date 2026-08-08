import {
  clearGoogleRevokedState,
  isGoogleRevoked,
  markGoogleAsRevoked,
} from "./google.auth.state";
import {
  hasGoogleReconnectRequired,
  markAccountReconnectRequired,
  resetGoogleReconnectRequiredForTests,
} from "./google.reconnect.state";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("google-auth-state.util", () => {
  beforeEach(() => {
    clearGoogleRevokedState();
    resetGoogleReconnectRequiredForTests();
  });

  afterEach(() => {
    clearGoogleRevokedState();
    resetGoogleReconnectRequiredForTests();
  });

  describe("markGoogleAsRevoked", () => {
    it("should set the in-memory revoked flag", () => {
      markGoogleAsRevoked();

      expect(isGoogleRevoked()).toBe(true);
    });
  });

  describe("clearGoogleRevokedState", () => {
    it("should clear the in-memory revoked flag and reconnect overrides", () => {
      markGoogleAsRevoked();
      markAccountReconnectRequired({
        connectionId: "conn-1",
        accountEmail: "a@example.com",
      });
      expect(isGoogleRevoked()).toBe(true);
      expect(hasGoogleReconnectRequired()).toBe(true);

      clearGoogleRevokedState();

      expect(isGoogleRevoked()).toBe(false);
      expect(hasGoogleReconnectRequired()).toBe(false);
    });
  });

  describe("isGoogleRevoked", () => {
    it("should return true when revoked flag is set", () => {
      markGoogleAsRevoked();
      expect(isGoogleRevoked()).toBe(true);
    });

    it("should return false when revoked flag is not set", () => {
      expect(isGoogleRevoked()).toBe(false);
    });

    it("should return false after clearGoogleRevokedState is called", () => {
      markGoogleAsRevoked();
      clearGoogleRevokedState();
      expect(isGoogleRevoked()).toBe(false);
    });
  });
});
