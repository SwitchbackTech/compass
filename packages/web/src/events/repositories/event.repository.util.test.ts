import {
  createGetEventRepository,
  createGetEventRepositorySource,
} from "./event.repository.factory";
import { LocalEventRepository } from "./local.event.repository";
import { RemoteEventRepository } from "./remote.event.repository";
import { beforeEach, describe, expect, it } from "bun:test";

describe("getEventRepositorySource", () => {
  let hasUserEverAuthenticated = false;
  let isBackendUnavailable = false;

  const getEventRepositorySource = createGetEventRepositorySource({
    hasUserEverAuthenticated: () => hasUserEverAuthenticated,
    isBackendUnavailable: () => isBackendUnavailable,
  });

  beforeEach(() => {
    hasUserEverAuthenticated = false;
    isBackendUnavailable = false;
  });

  it("returns 'remote' when a session exists", () => {
    expect(getEventRepositorySource(true)).toBe("remote");
  });

  it("returns 'local' when no session exists", () => {
    expect(getEventRepositorySource(false)).toBe("local");
  });

  it("returns 'remote' when a returning user has no active session", () => {
    hasUserEverAuthenticated = true;

    expect(getEventRepositorySource(false)).toBe("remote");
  });

  it("keeps remote for authenticated sessions so a reconnect-required sibling cannot demote healthy accounts", () => {
    hasUserEverAuthenticated = true;

    expect(getEventRepositorySource(true)).toBe("remote");
  });

  it("returns 'local' for a returning user when the backend is unavailable", () => {
    hasUserEverAuthenticated = true;
    isBackendUnavailable = true;

    expect(getEventRepositorySource(false)).toBe("local");
  });

  it("returns 'local' for an active session when the backend is unavailable", () => {
    isBackendUnavailable = true;

    expect(getEventRepositorySource(true)).toBe("local");
  });
});

describe("getEventRepository", () => {
  let hasUserEverAuthenticated = false;
  let isBackendUnavailable = false;

  const getEventRepository = createGetEventRepository({
    createLocalEventRepository: () => new LocalEventRepository(),
    createRemoteEventRepository: () => new RemoteEventRepository(),
    hasUserEverAuthenticated: () => hasUserEverAuthenticated,
    isBackendUnavailable: () => isBackendUnavailable,
  });

  beforeEach(() => {
    hasUserEverAuthenticated = false;
    isBackendUnavailable = false;
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
