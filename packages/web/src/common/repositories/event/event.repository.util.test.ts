import * as authStateUtil from "@web/auth/compass/state/auth.state.util";
import * as googleAuthState from "@web/auth/google/state/google.auth.state";
import { getEventRepository } from "./event.repository.util";
import { LocalEventRepository } from "./local.event.repository";
import { RemoteEventRepository } from "./remote.event.repository";

jest.mock("@web/common/classes/Session");
jest.mock("@web/auth/google/state/google.auth.state");
jest.mock("@web/auth/compass/state/auth.state.util");

describe("getEventRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user has not authenticated, Google not revoked
    jest
      .spyOn(authStateUtil, "hasUserEverAuthenticated")
      .mockReturnValue(false);
    jest.spyOn(googleAuthState, "isGoogleRevoked").mockReturnValue(false);
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
      jest
        .spyOn(authStateUtil, "hasUserEverAuthenticated")
        .mockReturnValue(true);

      const repository = getEventRepository(false); // session doesn't exist

      expect(repository).toBeInstanceOf(RemoteEventRepository);
    });

    it("should return RemoteEventRepository when user has authenticated and session exists", () => {
      jest
        .spyOn(authStateUtil, "hasUserEverAuthenticated")
        .mockReturnValue(true);

      const repository = getEventRepository(true);

      expect(repository).toBeInstanceOf(RemoteEventRepository);
    });

    it("should prioritize authentication flag over session state", () => {
      // User authenticated in the past, but session expired
      jest
        .spyOn(authStateUtil, "hasUserEverAuthenticated")
        .mockReturnValue(true);

      const repository = getEventRepository(false);

      // Should still use remote repository to prevent event disappearance
      expect(repository).toBeInstanceOf(RemoteEventRepository);
    });
  });

  describe("with Google revoked", () => {
    it("should return LocalEventRepository when Google is revoked (even if authenticated)", () => {
      jest
        .spyOn(authStateUtil, "hasUserEverAuthenticated")
        .mockReturnValue(true);
      jest.spyOn(googleAuthState, "isGoogleRevoked").mockReturnValue(true);

      const repository = getEventRepository(true);

      expect(repository).toBeInstanceOf(LocalEventRepository);
    });

    it("should return LocalEventRepository when Google is revoked and session exists", () => {
      jest.spyOn(googleAuthState, "isGoogleRevoked").mockReturnValue(true);

      const repository = getEventRepository(true);

      expect(repository).toBeInstanceOf(LocalEventRepository);
    });

    it("should prioritize revoked state over authentication flag", () => {
      // User authenticated in the past, but Google was revoked
      jest
        .spyOn(authStateUtil, "hasUserEverAuthenticated")
        .mockReturnValue(true);
      jest.spyOn(googleAuthState, "isGoogleRevoked").mockReturnValue(true);

      const repository = getEventRepository(true);

      // Should use local repository to prevent API errors
      expect(repository).toBeInstanceOf(LocalEventRepository);
    });
  });
});
