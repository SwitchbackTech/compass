import { type SyncConfig } from "@sync/config/sync.config";
import {
  CONTACTS_FEATURE_SCOPES,
  GOOGLE_SCOPE_CALENDAR_EVENTS,
} from "@sync/providers/google/google.scopes";
import { googleCapabilitiesFromScopes } from "@sync/providers/google/google-capabilities";
import { ProviderNotConfiguredError } from "@sync/providers/provider-adapters";
import {
  buildProviderRegistry,
  ProviderRegistry,
} from "@sync/providers/provider-registry";

const googleConfig = (): SyncConfig =>
  ({
    NODE_ENV: "test",
    MONGO_URI: "mongodb://localhost/compass_sync",
    INTERNAL_AUTH_TOKEN: "token",
    CALLBACK_BASE_URL: "http://localhost:3010",
    EXECUTION: "passive",
    MAX_CONCURRENCY: 4,
    RESERVED_PULL_LANES: 1,
    ENFORCE_LEAST_PRIVILEGE: false,
    COMPASS_API_DATABASE: "prod_calendar",
    GOOGLE_CLIENT_ID: "id.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "secret",
  }) as SyncConfig;

const unconfiguredConfig = (): SyncConfig =>
  ({
    ...googleConfig(),
    GOOGLE_CLIENT_ID: undefined,
    GOOGLE_CLIENT_SECRET: undefined,
  }) as SyncConfig;

describe("ProviderRegistry", () => {
  it("throws ProviderNotConfiguredError for an unknown kind", () => {
    const registry = buildProviderRegistry(googleConfig());
    expect(() => registry.get("microsoft")).toThrow(ProviderNotConfiguredError);
    expect(() => registry.get("microsoft")).toThrow(/microsoft/i);
  });

  it("lists only configured providers in kinds()", () => {
    expect(buildProviderRegistry(googleConfig()).kinds()).toEqual(["google"]);
    expect(buildProviderRegistry(unconfiguredConfig()).kinds()).toEqual([]);
  });

  it("returns capabilities per kind from granted scopes", () => {
    const registry = buildProviderRegistry(googleConfig());
    const google = registry.get("google");
    expect(
      google.capabilitiesFromScopes([GOOGLE_SCOPE_CALENDAR_EVENTS]),
    ).toEqual(googleCapabilitiesFromScopes([GOOGLE_SCOPE_CALENDAR_EVENTS]));
  });

  it("maps contact features to provider scopes", () => {
    const registry = buildProviderRegistry(googleConfig());
    expect(registry.get("google").scopes.forFeatures(["contacts"])).toEqual(
      CONTACTS_FEATURE_SCOPES,
    );
    expect(registry.get("google").scopes.forFeatures([])).toEqual([]);
  });

  it("exposes resolveAdapters and resolveAuth for configured kinds", () => {
    const registry = buildProviderRegistry(googleConfig());
    const adapters = registry.resolveAdapters()("google");
    expect(adapters.auth).toBeDefined();
    expect(registry.resolveAuth()("google")).toBe(adapters.auth);
  });

  it("starts empty before register()", () => {
    const registry = new ProviderRegistry();
    expect(registry.kinds()).toEqual([]);
    expect(registry.has("google")).toBe(false);
    expect(registry.isConfigured()).toBe(false);
  });
});
