import * as authState from "@web/auth/compass/state/auth.state.util";
import * as googleAuthState from "@web/auth/google/state/google.auth.state";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";

const hasUserEverAuthenticatedSpy = spyOn(
  authState,
  "hasUserEverAuthenticated",
);
const isGoogleRevokedSpy = spyOn(googleAuthState, "isGoogleRevoked");

const { LocalEventRepository } = await import("./local.event.repository");
const { RemoteEventRepository } = await import("./remote.event.repository");
const { getEventRepository } = await import("./event.repository.util");

describe("getEventRepository", () => {
  beforeEach(() => {
    hasUserEverAuthenticatedSpy.mockReset();
    hasUserEverAuthenticatedSpy.mockReturnValue(false);
    isGoogleRevokedSpy.mockReset();
    isGoogleRevokedSpy.mockReturnValue(false);
  });

  it("uses remote storage when a session exists", () => {
    expect(getEventRepository(true)).toBeInstanceOf(RemoteEventRepository);
  });

  it("uses local storage when no session exists", () => {
    expect(getEventRepository(false)).toBeInstanceOf(LocalEventRepository);
  });

  it("uses remote storage when a returning user has no active session", () => {
    hasUserEverAuthenticatedSpy.mockReturnValue(true);

    expect(getEventRepository(false)).toBeInstanceOf(RemoteEventRepository);
  });

  it("uses local storage when Google disconnected Compass", () => {
    isGoogleRevokedSpy.mockReturnValue(true);

    expect(getEventRepository(true)).toBeInstanceOf(LocalEventRepository);
  });

  it("uses local storage when Google disconnected Compass for a returning user", () => {
    hasUserEverAuthenticatedSpy.mockReturnValue(true);
    isGoogleRevokedSpy.mockReturnValue(true);

    expect(getEventRepository(false)).toBeInstanceOf(LocalEventRepository);
  });
});
