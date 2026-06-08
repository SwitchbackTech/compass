import { createGetEventRepository } from "./event.repository.factory";
import { LocalEventRepository } from "./local.event.repository";
import { RemoteEventRepository } from "./remote.event.repository";
import { beforeEach, describe, expect, it } from "bun:test";

describe("getEventRepository", () => {
  let hasUserEverAuthenticated = false;
  let isBackendUnavailable = false;
  let isGoogleRevoked = false;

  const getEventRepository = createGetEventRepository({
    createLocalEventRepository: () => new LocalEventRepository(),
    createRemoteEventRepository: () => new RemoteEventRepository(),
    hasUserEverAuthenticated: () => hasUserEverAuthenticated,
    isBackendUnavailable: () => isBackendUnavailable,
    isGoogleRevoked: () => isGoogleRevoked,
  });

  beforeEach(() => {
    hasUserEverAuthenticated = false;
    isBackendUnavailable = false;
    isGoogleRevoked = false;
  });

  it("uses remote storage when a session exists", () => {
    expect(getEventRepository(true)).toBeInstanceOf(RemoteEventRepository);
  });

  it("uses local storage when no session exists", () => {
    expect(getEventRepository(false)).toBeInstanceOf(LocalEventRepository);
  });

  it("uses remote storage when a returning user has no active session", () => {
    hasUserEverAuthenticated = true;

    expect(getEventRepository(false)).toBeInstanceOf(RemoteEventRepository);
  });

  it("uses local storage when Google disconnected Compass", () => {
    isGoogleRevoked = true;

    expect(getEventRepository(true)).toBeInstanceOf(LocalEventRepository);
  });

  it("uses local storage when Google disconnected Compass for a returning user", () => {
    hasUserEverAuthenticated = true;
    isGoogleRevoked = true;

    expect(getEventRepository(false)).toBeInstanceOf(LocalEventRepository);
  });

  it("uses local storage for a returning user when the backend is unavailable", () => {
    hasUserEverAuthenticated = true;
    isBackendUnavailable = true;

    expect(getEventRepository(false)).toBeInstanceOf(LocalEventRepository);
  });

  it("uses local storage for an active session when the backend is unavailable", () => {
    isBackendUnavailable = true;

    expect(getEventRepository(true)).toBeInstanceOf(LocalEventRepository);
  });
});
