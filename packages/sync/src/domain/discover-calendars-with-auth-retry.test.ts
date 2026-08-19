import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { discoverCalendarsWithAuthRetry } from "@sync/domain/discover-calendars-with-auth-retry";
import { type AccessTokenSource } from "@sync/domain/provider-write-ladder";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import {
  type CalendarDiscovery,
  type ProviderCalendarAdapter,
  ProviderCalendarError,
} from "@sync/providers/provider-calendar.port";
import { describe, expect, it } from "bun:test";

const connectionId = "507f1f77bcf86cd799439011" as ConnectionId;

const emptyDiscovery = (): CalendarDiscovery => ({
  calendars: [],
  cursor: "cursor-1",
});

class ScriptedDiscovery implements ProviderCalendarAdapter {
  tokens: string[] = [];
  constructor(private readonly outcomes: Array<CalendarDiscovery | Error>) {}
  async discoverCalendars(input: {
    accessToken: string;
    cursor?: string;
  }): Promise<CalendarDiscovery> {
    this.tokens.push(input.accessToken);
    const next = this.outcomes.shift();
    if (!next) throw new Error("ScriptedDiscovery: no outcome left");
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

describe("discoverCalendarsWithAuthRetry", () => {
  it("returns the discovery unchanged when the read succeeds", async () => {
    const discovery = emptyDiscovery();
    const adapter = new ScriptedDiscovery([discovery]);
    const source = custody({ tokens: ["unused"] });

    const result = await discoverCalendarsWithAuthRetry(
      { discovery: adapter, custody: source },
      connectionId,
      { accessToken: "cached-token" },
    );

    expect(result).toEqual({ discovery, accessToken: "cached-token" });
    expect(source.invalidated).toEqual([]);
    expect(adapter.tokens).toEqual(["cached-token"]);
  });

  it("rethrows non-auth discovery errors without touching the cache", async () => {
    const adapter = new ScriptedDiscovery([
      new ProviderCalendarError("transient", "429"),
    ]);
    const source = custody({});

    await expect(
      discoverCalendarsWithAuthRetry(
        { discovery: adapter, custody: source },
        connectionId,
        { accessToken: "cached-token" },
      ),
    ).rejects.toMatchObject({ reason: "transient" });
    expect(source.invalidated).toEqual([]);
  });

  it("invalidates the cached token and retries discovery with a fresh one", async () => {
    const discovery = emptyDiscovery();
    const adapter = new ScriptedDiscovery([
      new ProviderCalendarError("authExpired", "401"),
      discovery,
    ]);
    const source = custody({ tokens: ["fresh-token"] });

    const result = await discoverCalendarsWithAuthRetry(
      { discovery: adapter, custody: source },
      connectionId,
      { accessToken: "stale-token" },
    );

    expect(result).toEqual({ discovery, accessToken: "fresh-token" });
    expect(source.invalidated).toEqual([connectionId]);
    expect(adapter.tokens).toEqual(["stale-token", "fresh-token"]);
  });

  it("surfaces a revoked grant when refresh fails after the 401", async () => {
    const adapter = new ScriptedDiscovery([
      new ProviderCalendarError("authExpired", "401"),
    ]);
    const source = custody({
      refreshError: new ProviderAuthError(
        "authorizationRevoked",
        "invalid_grant",
      ),
    });

    await expect(
      discoverCalendarsWithAuthRetry(
        { discovery: adapter, custody: source },
        connectionId,
        { accessToken: "stale-token" },
      ),
    ).rejects.toMatchObject({ reason: "authorizationRevoked" });
    expect(source.invalidated).toEqual([connectionId]);
  });

  it("treats a 401 on the freshly minted token as a dead grant", async () => {
    const adapter = new ScriptedDiscovery([
      new ProviderCalendarError("authExpired", "401"),
      new ProviderCalendarError("authExpired", "401"),
    ]);
    const source = custody({ tokens: ["fresh-token"] });

    await expect(
      discoverCalendarsWithAuthRetry(
        { discovery: adapter, custody: source },
        connectionId,
        { accessToken: "stale-token" },
      ),
    ).rejects.toMatchObject({
      name: "ProviderAuthError",
      reason: "authorizationRevoked",
    });
    expect(source.invalidated).toEqual([connectionId]);
    expect(adapter.tokens).toEqual(["stale-token", "fresh-token"]);
  });
});
