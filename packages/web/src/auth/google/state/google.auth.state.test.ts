import {
  clearGoogleRevokedState,
  isGoogleRevoked,
  markGoogleAsRevoked,
} from "./google.auth.state";

describe("google-auth-state.util", () => {
  beforeEach(() => {
    clearGoogleRevokedState();
  });

  afterEach(() => {
    clearGoogleRevokedState();
  });

  describe("markGoogleAsRevoked", () => {
    it("should set the in-memory revoked flag", () => {
      markGoogleAsRevoked();

      expect(isGoogleRevoked()).toBe(true);
    });
  });

  describe("clearGoogleRevokedState", () => {
    it("should clear the in-memory revoked flag", () => {
      markGoogleAsRevoked();
      expect(isGoogleRevoked()).toBe(true);

      clearGoogleRevokedState();

      expect(isGoogleRevoked()).toBe(false);
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
