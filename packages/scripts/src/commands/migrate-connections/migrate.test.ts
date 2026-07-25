import { migrateProviderConnections } from "@scripts/commands/migrate-connections/migrate";
import { ObjectId } from "mongodb";
import { describe, expect, it, mock } from "bun:test";

const NOW = new Date("2026-07-25T04:00:00.000Z");
const USER_ID = new ObjectId("507f1f77bcf86cd799439011");
const CONNECTION_ID = "507f1f77bcf86cd799439099";

describe("migrateProviderConnections", () => {
  it("dry-run reports would_create without writing", async () => {
    const upsert = mock(() => {
      throw new Error("should not upsert in dry-run");
    });
    const store = mock(() => {
      throw new Error("should not store in dry-run");
    });

    const report = await migrateProviderConnections(
      {
        connections: {
          listByPrincipal: async () => [],
          upsertByProviderAccount: upsert,
        } as never,
        credentials: { store, findByConnection: async () => null } as never,
      },
      [
        {
          _id: USER_ID,
          email: "alice@example.com",
          google: {
            googleId: "google-1",
            picture: "",
            gRefreshToken: "refresh-1",
          },
        },
      ],
      { dryRun: true, now: NOW },
    );

    expect(report.dryRun).toBe(true);
    expect(report.counts.wouldCreate).toBe(1);
    expect(report.results[0]?.action).toBe("would_create");
    expect(upsert).not.toHaveBeenCalled();
    expect(store).not.toHaveBeenCalled();
  });

  it("skips users without google or refresh token", async () => {
    const report = await migrateProviderConnections(
      {
        connections: {
          listByPrincipal: async () => [],
          upsertByProviderAccount: async () => {
            throw new Error("unused");
          },
        } as never,
        credentials: {
          store: async () => {
            throw new Error("unused");
          },
          findByConnection: async () => null,
        } as never,
      },
      [
        {
          _id: new ObjectId("507f1f77bcf86cd799439012"),
          email: "password@example.com",
        },
        {
          _id: new ObjectId("507f1f77bcf86cd799439013"),
          email: "oauth@example.com",
          google: {
            googleId: "google-2",
            picture: "",
            gRefreshToken: "",
          },
        },
      ],
      { dryRun: true, now: NOW },
    );

    expect(report.counts.skipped).toBe(2);
    expect(report.results.map((r) => r.skipCategory)).toEqual([
      "no_google_identity",
      "missing_refresh_token",
    ]);
  });

  it("apply creates then rerun updates the same connection id", async () => {
    let existing: {
      _id: string;
      provider: "google";
      account: { providerAccountId: string };
    } | null = null;
    const upsert = mock(
      async (input: { account: { providerAccountId: string } }) => {
        existing = {
          _id: CONNECTION_ID,
          provider: "google",
          account: { providerAccountId: input.account.providerAccountId },
        };
        return existing;
      },
    );
    const storedToken = { value: "" };
    const store = mock(async (input: { refreshToken: string }) => {
      storedToken.value = input.refreshToken;
      return {
        _id: CONNECTION_ID,
        refreshToken: input.refreshToken,
        scopes: [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/calendar.readonly",
          "https://www.googleapis.com/auth/calendar.events",
        ],
      };
    });
    const findByConnection = mock(async () => ({
      _id: CONNECTION_ID,
      refreshToken: storedToken.value,
      scopes: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
      ],
    }));

    const deps = {
      connections: {
        listByPrincipal: async () => (existing ? [existing] : []),
        upsertByProviderAccount: upsert,
      } as never,
      credentials: { store, findByConnection } as never,
    };
    const users = [
      {
        _id: USER_ID,
        email: "alice@example.com",
        google: {
          googleId: "google-1",
          picture: "",
          gRefreshToken: "refresh-1",
        },
      },
    ];

    const first = await migrateProviderConnections(deps, users, {
      dryRun: false,
      now: NOW,
    });
    expect(first.counts.created).toBe(1);
    expect(first.results[0]?.connectionId).toBe(CONNECTION_ID);
    expect(first.results[0]?.credentialVerified).toBe(true);

    const second = await migrateProviderConnections(deps, users, {
      dryRun: false,
      now: NOW,
    });
    expect(second.counts.updated).toBe(1);
    expect(second.results[0]?.connectionId).toBe(CONNECTION_ID);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(store).toHaveBeenCalledTimes(2);
  });
});
