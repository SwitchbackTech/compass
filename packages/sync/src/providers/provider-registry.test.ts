import { NodeEnv } from "@core/constants/core.constants";
import { type SyncConfig } from "@sync/config/sync.config";
import { ProviderNotConfiguredError } from "@sync/providers/provider-adapters";
import { type ProviderAuthAdapter } from "@sync/providers/provider-auth.port";
import {
  buildProviderRegistry,
  GOOGLE_CALLBACK_PATH,
  GOOGLE_NOTIFICATIONS_PATH,
  MICROSOFT_CALLBACK_PATH,
  MICROSOFT_NOTIFICATIONS_PATH,
} from "@sync/providers/provider-registry";
import { describe, expect, it } from "bun:test";

const baseConfig = (overrides: Partial<SyncConfig> = {}): SyncConfig =>
  ({
    NODE_ENV: NodeEnv.Test,
    PORT: 3010,
    MONGO_URI: "mongodb://localhost/test",
    INTERNAL_AUTH_TOKEN: "token",
    CALLBACK_BASE_URL: "https://example.test",
    EXECUTION: "passive",
    MAX_CONCURRENCY: 4,
    RESERVED_PULL_LANES: 1,
    ENFORCE_LEAST_PRIVILEGE: false,
    COMPASS_API_DATABASE: "prod_calendar",
    ...overrides,
  }) as SyncConfig;

const fakeAuth = (): ProviderAuthAdapter => ({
  buildAuthorizationUrl: () => "https://example.test/auth",
  exchangeAuthorizationCode: async () => {
    throw new Error("unused");
  },
  refreshAccessToken: async () => {
    throw new Error("unused");
  },
  revoke: async () => {},
});

describe("ProviderRegistry", () => {
  it("throws ProviderNotConfiguredError for an unknown kind", () => {
    const registry = buildProviderRegistry(
      baseConfig({
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      }),
    );
    expect(() => registry.get("microsoft")).toThrow(ProviderNotConfiguredError);
    expect(() => registry.get("apple")).toThrow(ProviderNotConfiguredError);
    try {
      registry.get("microsoft");
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderNotConfiguredError);
      expect((error as ProviderNotConfiguredError).provider).toBe("microsoft");
    }
  });

  it("lists only configured providers in kinds()", () => {
    expect(buildProviderRegistry(baseConfig()).kinds()).toEqual([]);
    expect(
      buildProviderRegistry(
        baseConfig({
          GOOGLE_CLIENT_ID: "id",
          GOOGLE_CLIENT_SECRET: "secret",
        }),
      ).kinds(),
    ).toEqual(["google"]);
    expect(
      buildProviderRegistry(
        baseConfig({
          MICROSOFT_CLIENT_ID: "ms-id",
          MICROSOFT_CLIENT_SECRET: "ms-secret",
        }),
      ).kinds(),
    ).toEqual(["microsoft"]);
    expect(
      buildProviderRegistry(
        baseConfig({
          GOOGLE_CLIENT_ID: "id",
          GOOGLE_CLIENT_SECRET: "secret",
          MICROSOFT_CLIENT_ID: "ms-id",
          MICROSOFT_CLIENT_SECRET: "ms-secret",
        }),
      ).kinds(),
    ).toEqual(["google", "microsoft"]);
  });

  it("registers microsoft only when both client id and secret are present", () => {
    expect(
      buildProviderRegistry(baseConfig({ MICROSOFT_CLIENT_ID: "ms-id" })).has(
        "microsoft",
      ),
    ).toBe(false);
    expect(
      buildProviderRegistry(
        baseConfig({ MICROSOFT_CLIENT_SECRET: "ms-secret" }),
      ).has("microsoft"),
    ).toBe(false);
    expect(
      buildProviderRegistry(
        baseConfig({
          MICROSOFT_CLIENT_ID: "ms-id",
          MICROSOFT_CLIENT_SECRET: "ms-secret",
        }),
      ).has("microsoft"),
    ).toBe(true);
  });

  it("returns capabilities per kind", () => {
    const registry = buildProviderRegistry(
      baseConfig({
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      }),
    );
    const google = registry.get("google");
    expect(google.callbackPath).toBe(GOOGLE_CALLBACK_PATH);
    expect(google.notificationsCallbackPath).toBe(GOOGLE_NOTIFICATIONS_PATH);
    expect(registry.callbackUrlFor("https://example.test", "google")).toBe(
      "https://example.test/sync/notifications/google",
    );
    expect(google.capabilities).toEqual(
      expect.arrayContaining([
        "readEvents",
        "writeEvents",
        "readBusy",
        "inviteAttendees",
        "changeNotifications",
        "incrementalChanges",
        "suggestContacts",
      ]),
    );
    expect(
      google.capabilitiesFromScopes([
        "https://www.googleapis.com/auth/calendar.events",
      ]),
    ).toContain("writeEvents");
    expect(google.scopes.forFeatures(["contacts"])).toEqual([
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/contacts.other.readonly",
    ]);
    expect(google.scopes.forFeatures([])).toEqual([]);
  });

  it("returns microsoft capabilities and paths when configured", () => {
    const registry = buildProviderRegistry(
      baseConfig({
        MICROSOFT_CLIENT_ID: "ms-id",
        MICROSOFT_CLIENT_SECRET: "ms-secret",
      }),
    );
    const microsoft = registry.get("microsoft");
    expect(microsoft.callbackPath).toBe(MICROSOFT_CALLBACK_PATH);
    expect(microsoft.notificationsCallbackPath).toBe(
      MICROSOFT_NOTIFICATIONS_PATH,
    );
    expect(registry.callbackUrlFor("https://example.test", "microsoft")).toBe(
      "https://example.test/sync/notifications/microsoft",
    );
    expect(microsoft.capabilities).toEqual(
      expect.arrayContaining([
        "readEvents",
        "writeEvents",
        "readBusy",
        "inviteAttendees",
        "changeNotifications",
        "incrementalChanges",
        "suggestContacts",
      ]),
    );
    expect(microsoft.capabilitiesFromScopes(["Calendars.ReadWrite"])).toContain(
      "changeNotifications",
    );
    expect(
      microsoft.capabilitiesFromScopes(["Calendars.ReadWrite"]),
    ).not.toContain("suggestContacts");
    expect(
      microsoft.capabilitiesFromScopes(["Calendars.ReadWrite", "People.Read"]),
    ).toContain("suggestContacts");
    expect(microsoft.scopes.forFeatures(["contacts"])).toEqual(["People.Read"]);
    expect(microsoft.scopes.forFeatures([])).toEqual([]);
  });

  it("registers google from a test auth override without yaml credentials", () => {
    const registry = buildProviderRegistry(baseConfig(), {
      google: { auth: fakeAuth() },
    });
    expect(registry.has("google")).toBe(true);
    expect(registry.kinds()).toEqual(["google"]);
  });
});
