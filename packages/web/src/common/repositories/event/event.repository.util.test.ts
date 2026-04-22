import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockIsGoogleRevoked = mock(() => false);

mock.module("@web/auth/google/state/google.auth.state", () => ({
  isGoogleRevoked: mockIsGoogleRevoked,
}));

const { LocalEventRepository } = await import("./local.event.repository");
const { RemoteEventRepository } = await import("./remote.event.repository");
const { getEventRepository } = await import("./event.repository.util");

describe("getEventRepository", () => {
  beforeEach(() => {
    mockIsGoogleRevoked.mockReset();
    mockIsGoogleRevoked.mockReturnValue(false);
  });

  it("uses remote storage when a session exists", () => {
    expect(getEventRepository(true)).toBeInstanceOf(RemoteEventRepository);
  });

  it("uses local storage when no session exists", () => {
    expect(getEventRepository(false)).toBeInstanceOf(LocalEventRepository);
  });

  it("uses local storage when Google access was revoked", () => {
    mockIsGoogleRevoked.mockReturnValue(true);

    expect(getEventRepository(true)).toBeInstanceOf(LocalEventRepository);
  });
});
