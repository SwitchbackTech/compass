import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const hasUserEverAuthenticated = mock();
const clearAnonymousCalendarChangeSignUpPrompt = mock();
const clearAuthenticationState = mock();
const getAuthState = mock();
const getLastKnownEmail = mock();
const markAnonymousCalendarChangeForSignUpPrompt = mock();
const markUserAsAuthenticated = mock();
const shouldShowAnonymousCalendarChangeSignUpPrompt = mock();
const subscribeToAuthState = mock();
const updateAuthState = mock();
const isGoogleRevoked = mock();

mock.module("@web/auth/compass/state/auth.state.util", () => ({
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
}));

mock.module("@web/auth/google/state/google.auth.state", () => ({
  clearGoogleRevokedState: mock(),
  isGoogleRevoked,
  markGoogleAsRevoked: mock(),
}));

const { getEventRepository } =
  require("./event.repository.util") as typeof import("./event.repository.util");
const { LocalEventRepository } =
  require("./local.event.repository") as typeof import("./local.event.repository");
const { RemoteEventRepository } =
  require("./remote.event.repository") as typeof import("./remote.event.repository");

describe("getEventRepository", () => {
  beforeEach(() => {
    // Default: user has not authenticated, Google not revoked
    hasUserEverAuthenticated.mockClear();
    hasUserEverAuthenticated.mockReturnValue(false);
    clearAnonymousCalendarChangeSignUpPrompt.mockClear();
    clearAuthenticationState.mockClear();
    getAuthState.mockClear();
    getLastKnownEmail.mockClear();
    markAnonymousCalendarChangeForSignUpPrompt.mockClear();
    markUserAsAuthenticated.mockClear();
    shouldShowAnonymousCalendarChangeSignUpPrompt.mockClear();
    subscribeToAuthState.mockClear();
    updateAuthState.mockClear();
    isGoogleRevoked.mockClear();
    isGoogleRevoked.mockReturnValue(false);
  });

  describe("without authentication flag", () => {
    it("should return RemoteEventRepository when session exists", () => {
      const repository = getEventRepository(true);
      expect(repository).toBeInstanceOf(RemoteEventRepository);
    });

    it("should return LocalEventRepository when session does not exist", () => {
      const repository = getEventRepository(false);
      expect(repository).toBeInstanceOf(LocalEventRepository);
    });
  });

  describe("with authentication flag", () => {
    it("should return RemoteEventRepository when user has authenticated (regardless of session)", () => {
      hasUserEverAuthenticated.mockReturnValue(true);

      const repository = getEventRepository(false); // session doesn't exist

      expect(repository).toBeInstanceOf(RemoteEventRepository);
    });

    it("should return RemoteEventRepository when user has authenticated and session exists", () => {
      hasUserEverAuthenticated.mockReturnValue(true);

      const repository = getEventRepository(true);

      expect(repository).toBeInstanceOf(RemoteEventRepository);
    });

    it("should prioritize authentication flag over session state", () => {
      // User authenticated in the past, but session expired
      hasUserEverAuthenticated.mockReturnValue(true);

      const repository = getEventRepository(false);

      // Should still use remote repository to prevent event disappearance
      expect(repository).toBeInstanceOf(RemoteEventRepository);
    });
  });

  describe("with Google revoked", () => {
    it("should return LocalEventRepository when Google is revoked (even if authenticated)", () => {
      hasUserEverAuthenticated.mockReturnValue(true);
      isGoogleRevoked.mockReturnValue(true);

      const repository = getEventRepository(true);

      expect(repository).toBeInstanceOf(LocalEventRepository);
    });

    it("should return LocalEventRepository when Google is revoked and session exists", () => {
      isGoogleRevoked.mockReturnValue(true);

      const repository = getEventRepository(true);

      expect(repository).toBeInstanceOf(LocalEventRepository);
    });

    it("should prioritize revoked state over authentication flag", () => {
      // User authenticated in the past, but Google was revoked
      hasUserEverAuthenticated.mockReturnValue(true);
      isGoogleRevoked.mockReturnValue(true);

      const repository = getEventRepository(true);

      // Should use local repository to prevent API errors
      expect(repository).toBeInstanceOf(LocalEventRepository);
    });
  });
});

afterAll(() => {
  mock.restore();
});
