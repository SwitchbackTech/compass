import {
  createGetEventRepository,
  createGetEventRepositorySource,
} from "./event.repository.factory";
import { LocalEventRepository } from "./local.event.repository";
import { RemoteEventRepository } from "./remote.event.repository";
import { beforeEach, describe, expect, it } from "bun:test";

describe("getEventRepositorySource", () => {
  let hasUserEverAuthenticated = false;

  const getEventRepositorySource = createGetEventRepositorySource({
    hasUserEverAuthenticated: () => hasUserEverAuthenticated,
  });

  beforeEach(() => {
    hasUserEverAuthenticated = false;
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
});

describe("getEventRepository", () => {
  let hasUserEverAuthenticated = false;

  const getEventRepository = createGetEventRepository({
    createLocalEventRepository: () => new LocalEventRepository(),
    createRemoteEventRepository: () => new RemoteEventRepository(),
    hasUserEverAuthenticated: () => hasUserEverAuthenticated,
  });

  beforeEach(() => {
    hasUserEverAuthenticated = false;
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
});
