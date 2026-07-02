import { createGetEventRepository, createGetEventRepositorySource } from "./event.repository.factory";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mocks must be set up before importing repository classes
const mockCreate = () => ({});
const mockEdit = () => ({});
const mockDelete = () => ({});

mock.module("@web/ducks/events/event.api", () => ({
  EventApi: {
    create: mockCreate,
    get: () => ({}),
    edit: mockEdit,
    delete: mockDelete,
    reorder: () => ({}),
  },
}));

// biome-ignore lint/suspicious/noExplicitAny: Lazy import to avoid TDZ with mocked EventApi
const { LocalEventRepository } = require("./local.event.repository") as any;
// biome-ignore lint/suspicious/noExplicitAny: Lazy import to avoid TDZ with mocked EventApi
const { RemoteEventRepository } = require("./remote.event.repository") as any;

describe("getEventRepositorySource", () => {
  let hasUserEverAuthenticated = false;
  let isBackendUnavailable = false;
  let isGoogleRevoked = false;

  const getEventRepositorySource = createGetEventRepositorySource({
    hasUserEverAuthenticated: () => hasUserEverAuthenticated,
    isBackendUnavailable: () => isBackendUnavailable,
    isGoogleRevoked: () => isGoogleRevoked,
  });

  beforeEach(() => {
    hasUserEverAuthenticated = false;
    isBackendUnavailable = false;
    isGoogleRevoked = false;
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

  it("returns 'local' when Google disconnected Compass", () => {
    isGoogleRevoked = true;

    expect(getEventRepositorySource(true)).toBe("local");
  });

  it("returns 'local' when Google disconnected Compass for a returning user", () => {
    hasUserEverAuthenticated = true;
    isGoogleRevoked = true;

    expect(getEventRepositorySource(false)).toBe("local");
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
  let isGoogleRevoked = false;
  let getEventRepository: ReturnType<typeof createGetEventRepository>;

  beforeEach(() => {
    hasUserEverAuthenticated = false;
    isBackendUnavailable = false;
    isGoogleRevoked = false;

    getEventRepository = createGetEventRepository({
      createLocalEventRepository: () => new LocalEventRepository(),
      createRemoteEventRepository: () => new RemoteEventRepository(),
      hasUserEverAuthenticated: () => hasUserEverAuthenticated,
      isBackendUnavailable: () => isBackendUnavailable,
      isGoogleRevoked: () => isGoogleRevoked,
    });
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
