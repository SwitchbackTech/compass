import {
  type ProviderCapability,
  type ProviderKind,
} from "@core/types/sync/identity.contracts";
import { type SyncConfig } from "@sync/config/sync.config";
import {
  googleAdapters,
  googleProviderConfigured,
  type ProviderAdapterOverrides,
} from "@sync/providers/google/build-provider-resolvers";
import { googleScopesForFeatures } from "@sync/providers/google/google.scopes";
import {
  GOOGLE_PROVIDER_CAPABILITIES,
  googleCapabilitiesFromScopes,
} from "@sync/providers/google/google-capabilities";
import {
  type ProviderAdapters,
  ProviderNotConfiguredError,
  type ResolveProviderAdapters,
  type ResolveProviderAuth,
} from "@sync/providers/provider-adapters";

export interface ProviderScopes {
  forFeatures(features: readonly string[]): readonly string[];
}

export interface ProviderRegistration {
  adapters: ProviderAdapters;
  scopes: ProviderScopes;
  capabilities: readonly ProviderCapability[];
  callbackPath: string;
  notificationsCallbackPath: string;
  capabilitiesFromScopes(granted: readonly string[]): ProviderCapability[];
}

export class ProviderRegistry {
  constructor(
    private readonly registrations: ReadonlyMap<
      ProviderKind,
      ProviderRegistration
    >,
  ) {}

  get(kind: ProviderKind): ProviderRegistration {
    const registration = this.registrations.get(kind);
    if (!registration) {
      throw new ProviderNotConfiguredError(kind);
    }
    return registration;
  }

  has(kind: ProviderKind): boolean {
    return this.registrations.has(kind);
  }

  kinds(): ProviderKind[] {
    return [...this.registrations.keys()];
  }

  callbackUrlFor(baseUrl: string, kind: ProviderKind): string {
    return `${baseUrl}${this.get(kind).notificationsCallbackPath}`;
  }
}

export const GOOGLE_CALLBACK_PATH = "/sync/google";
export const GOOGLE_NOTIFICATIONS_PATH = "/sync/notifications/google";
export const OAUTH_CALLBACK_PARAM_PATH = "/sync/:provider";
export const NOTIFICATIONS_PARAM_PATH = "/sync/notifications/:provider";

export function buildProviderRegistry(
  config: SyncConfig,
  overrides: ProviderAdapterOverrides = {},
): ProviderRegistry {
  const registrations = new Map<ProviderKind, ProviderRegistration>();
  // Microsoft and Apple registration lands in M-09 / A-08. Config for those
  // kinds is read into SyncConfig in this WP but does not register them yet.
  const googleOverride = overrides.google;
  if (googleProviderConfigured(config) || googleOverride?.auth !== undefined) {
    registrations.set("google", {
      adapters: googleAdapters(config, googleOverride),
      scopes: { forFeatures: googleScopesForFeatures },
      capabilities: GOOGLE_PROVIDER_CAPABILITIES,
      callbackPath: GOOGLE_CALLBACK_PATH,
      notificationsCallbackPath: GOOGLE_NOTIFICATIONS_PATH,
      capabilitiesFromScopes: googleCapabilitiesFromScopes,
    });
  }
  return new ProviderRegistry(registrations);
}

export function resolveAdaptersFrom(
  registry: ProviderRegistry,
): ResolveProviderAdapters {
  return (kind) => registry.get(kind).adapters;
}

export function resolveAuthFrom(
  registry: ProviderRegistry,
): ResolveProviderAuth {
  return (kind) => registry.get(kind).adapters.auth;
}
