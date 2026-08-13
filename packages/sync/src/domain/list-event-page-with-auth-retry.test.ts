import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { listEventPageWithAuthRetry } from "@sync/domain/list-event-page-with-auth-retry";
import { type AccessTokenSource } from "@sync/domain/provider-write-ladder";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import {
  type ProviderEventPage,
  ProviderEventReadError,
  type ProviderEventReader,
  type ProviderEventReadInput,
} from "@sync/providers/provider-event-reader.port";
import { describe, expect, it } from "bun:test";

const connectionId = "507f1f77bcf86cd799439011" as ConnectionId;

const emptyPage = (): ProviderEventPage => ({
  events: [],
  skipped: 0,
  nextPageToken: null,
  nextSyncToken: "cursor-1",
});

const input = (accessToken: string): ProviderEventReadInput => ({
  accessToken,
  calendarId: "primary",
});

class ScriptedReader implements ProviderEventReader {
  readonly provider = "google" as const;
  tokens: string[] = [];
  constructor(private readonly outcomes: Array<ProviderEventPage | Error>) {}
  async listEventPage(
    readInput: ProviderEventReadInput,
  ): Promise<ProviderEventPage> {
    this.tokens.push(readInput.accessToken);
    const next = this.outcomes.shift();
    if (!next) throw new Error("ScriptedReader: no outcome left");
    if (next instanceof Error) throw next;
    return next;
  }
}

const custody = (opts: {
  tokens?: string[];
  refreshError?: Error;
}): AccessTokenSource & { invalidated: string[] } => {
  const tokens = [...(opts.tokens ?? ["fresh-token"])];
  const invalidated: string[] = [];
  return {
    invalidated,
    getValidAccessToken: async () => {
      if (opts.refreshError) throw opts.refreshError;
      const token = tokens.shift();
      if (!token) throw new Error("custody: no token scripted");
      return token;
    },
    discardRevoked: async () => {},
    invalidateAccessToken: async (id) => {
      invalidated.push(id);
    },
  };
};

describe("listEventPageWithAuthRetry", () => {
  it("returns the page unchanged when the read succeeds", async () => {
    const page = emptyPage();
    const reader = new ScriptedReader([page]);
    const source = custody({ tokens: ["unused"] });

    const result = await listEventPageWithAuthRetry(
      { reader, custody: source },
      connectionId,
      input("cached-token"),
    );

    expect(result).toEqual({ page, accessToken: "cached-token" });
    expect(source.invalidated).toEqual([]);
    expect(reader.tokens).toEqual(["cached-token"]);
  });

  it("rethrows non-auth read errors without touching the cache", async () => {
    const reader = new ScriptedReader([
      new ProviderEventReadError("transient", "429"),
    ]);
    const source = custody({});

    await expect(
      listEventPageWithAuthRetry(
        { reader, custody: source },
        connectionId,
        input("cached-token"),
      ),
    ).rejects.toMatchObject({ reason: "transient" });
    expect(source.invalidated).toEqual([]);
  });

  it("invalidates the cached token and retries the page with a fresh one", async () => {
    const page = emptyPage();
    const reader = new ScriptedReader([
      new ProviderEventReadError("authExpired", "401"),
      page,
    ]);
    const source = custody({ tokens: ["fresh-token"] });

    const result = await listEventPageWithAuthRetry(
      { reader, custody: source },
      connectionId,
      input("stale-token"),
    );

    expect(result).toEqual({ page, accessToken: "fresh-token" });
    expect(source.invalidated).toEqual([connectionId]);
    expect(reader.tokens).toEqual(["stale-token", "fresh-token"]);
  });

  it("surfaces a revoked grant when refresh fails after the 401", async () => {
    const reader = new ScriptedReader([
      new ProviderEventReadError("authExpired", "401"),
    ]);
    const source = custody({
      refreshError: new ProviderAuthError(
        "authorizationRevoked",
        "invalid_grant",
      ),
    });

    await expect(
      listEventPageWithAuthRetry(
        { reader, custody: source },
        connectionId,
        input("stale-token"),
      ),
    ).rejects.toMatchObject({ reason: "authorizationRevoked" });
    expect(source.invalidated).toEqual([connectionId]);
  });

  it("treats a 401 on the freshly minted token as a dead grant", async () => {
    const reader = new ScriptedReader([
      new ProviderEventReadError("authExpired", "401"),
      new ProviderEventReadError("authExpired", "401"),
    ]);
    const source = custody({ tokens: ["fresh-token"] });

    await expect(
      listEventPageWithAuthRetry(
        { reader, custody: source },
        connectionId,
        input("stale-token"),
      ),
    ).rejects.toMatchObject({
      name: "ProviderAuthError",
      reason: "authorizationRevoked",
    });
    expect(source.invalidated).toEqual([connectionId]);
    expect(reader.tokens).toEqual(["stale-token", "fresh-token"]);
  });
});
