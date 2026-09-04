import { type ConnectionBeginFeatures } from "@core/types/sync/connection.contracts";
import {
  type ProviderCapability,
  type ProviderKind,
} from "@core/types/sync/identity.contracts";
import { type SyncConfig } from "@sync/config/sync.config";
import {
  googleAdapters,
  type ProviderAdapterOverrides,
} from "@sync/providers/google/build-provider-resolvers";
import { CONTACTS_FEATURE_SCOPES } from "@sync/providers/google/google.scopes";
import { googleCapabilitiesFromScopes } from "@sync/providers/google/google-capabilities";
import {
  type ProviderAdapters,
  ProviderNotConfiguredError,
  type ResolveProviderAdapters,
  type ResolveProviderAuth,
} from "@sync/providers/provider-adapters";

export interface ProviderScopes {
  forFeatures(features: ConnectionBeginFeatures): readonly string[];
}

export interface ProviderRegistration {
  adapters: ProviderAdapters;
  scopes: ProviderScopes;
  capabilitiesFromScopes: (granted: readonly string[]) => ProviderCapability[];
  callbackPath: string;
}

export class ProviderRegistry {
  readonly #entries = new Map<ProviderKind, ProviderRegistration>();

  register(kind: ProviderKind, entry: ProviderRegistration): void {
    this.#entries.set(kind, entry);
  }

  get(kind: ProviderKind): ProviderRegistration {
    const entry = this.#entries.get(kind);
    if (!entry) {
      throw new ProviderNotConfiguredError(kind);
    }
    return entry;
  }

  has(kind: ProviderKind): boolean {
    return this.#entries.has(kind);
  }

  kinds(): ProviderKind[] {
    return [...this.#entries.keys()];
  }

  isConfigured(): boolean {
    return this.#entries.size > 0;
  }

  resolveAdapters(): ResolveProviderAdapters {
    return (provider) => this.get(provider).adapters;
  }

  resolveAuth(): ResolveProviderAuth {
    return (provider) => this.get(provider).adapters.auth;
  }
}

function googleConfigured(config: SyncConfig): boolean {
  return Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
}

export function buildProviderRegistry(
  config: SyncConfig,
  overrides: ProviderAdapterOverrides = {},
): ProviderRegistry {
  const registry = new ProviderRegistry();

  if (googleConfigured(config) || overrides.google?.auth !== undefined) {
    registry.register("google", {
      adapters: googleAdapters(config, overrides.google),
      scopes: {
        forFeatures(features) {
          if (features.includes("contacts")) {
            return CONTACTS_FEATURE_SCOPES;
          }
          return [];
        },
      },
      capabilitiesFromScopes: googleCapabilitiesFromScopes,
      callbackPath: "/sync/google",
    });
  }

  return registry;
}
