import { googleScopesForFeatures } from "@core/providers/google.scopes";
import { microsoftScopesForFeatures } from "@core/providers/microsoft.scopes";
import {
  type ProviderCapability,
  type ProviderKind,
} from "@core/types/sync/identity.contracts";
import { type SyncConfig } from "@sync/config/sync.config";
import {
  APPLE_PROVIDER_CAPABILITIES,
  appleCapabilitiesFromScopes,
  appleScopesForFeatures,
} from "@sync/providers/apple/apple-capabilities";
import {
  appleAdapters,
  appleProviderConfigured,
  bindAppleAdaptersForConnection,
} from "@sync/providers/apple/build-provider-resolvers";
import {
  googleAdapters,
  googleProviderConfigured,
} from "@sync/providers/google/build-provider-resolvers";
import {
  GOOGLE_PROVIDER_CAPABILITIES,
  googleCapabilitiesFromScopes,
} from "@sync/providers/google/google-capabilities";
import {
  microsoftAdapters,
  microsoftProviderConfigured,
} from "@sync/providers/microsoft/build-provider-resolvers";
import {
  MICROSOFT_PROVIDER_CAPABILITIES,
  microsoftCapabilitiesFromScopes,
} from "@sync/providers/microsoft/microsoft-capabilities";
import {
  type ProviderAdapterOverrides,
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
  bindAdaptersForConnection?: (
    connection: {
      account: {
        email: string | null;
        providerAccountId?: string;
      };
    },
    adapters: ProviderAdapters,
  ) => ProviderAdapters;
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
export const MICROSOFT_CALLBACK_PATH = "/sync/microsoft";
export const MICROSOFT_NOTIFICATIONS_PATH = "/sync/notifications/microsoft";
export const APPLE_CALLBACK_PATH = "/sync/apple";
export const APPLE_NOTIFICATIONS_PATH = "/sync/notifications/apple";
export const OAUTH_CALLBACK_PARAM_PATH = "/sync/:provider";
export const NOTIFICATIONS_PARAM_PATH = "/sync/notifications/:provider";

/**
 * Everything `buildProviderRegistry` needs to decide whether a provider is
 * available and, if so, what to register for it. One row per provider: adding
 * the next one is a row here, not another copy of the register-if-configured
 * block.
 */
interface ProviderBuilder extends Omit<ProviderRegistration, "adapters"> {
  kind: ProviderKind;
  isConfigured(config: SyncConfig): boolean;
  buildAdapters(
    config: SyncConfig,
    override?: Partial<ProviderAdapters>,
  ): ProviderAdapters;
}

const PROVIDER_BUILDERS: readonly ProviderBuilder[] = [
  {
    kind: "google",
    isConfigured: googleProviderConfigured,
    buildAdapters: googleAdapters,
    scopes: { forFeatures: googleScopesForFeatures },
    capabilities: GOOGLE_PROVIDER_CAPABILITIES,
    callbackPath: GOOGLE_CALLBACK_PATH,
    notificationsCallbackPath: GOOGLE_NOTIFICATIONS_PATH,
    capabilitiesFromScopes: googleCapabilitiesFromScopes,
  },
  {
    kind: "microsoft",
    isConfigured: microsoftProviderConfigured,
    buildAdapters: microsoftAdapters,
    scopes: { forFeatures: microsoftScopesForFeatures },
    capabilities: MICROSOFT_PROVIDER_CAPABILITIES,
    callbackPath: MICROSOFT_CALLBACK_PATH,
    notificationsCallbackPath: MICROSOFT_NOTIFICATIONS_PATH,
    capabilitiesFromScopes: microsoftCapabilitiesFromScopes,
  },
  {
    kind: "apple",
    isConfigured: appleProviderConfigured,
    buildAdapters: appleAdapters,
    scopes: { forFeatures: appleScopesForFeatures },
    capabilities: APPLE_PROVIDER_CAPABILITIES,
    callbackPath: APPLE_CALLBACK_PATH,
    notificationsCallbackPath: APPLE_NOTIFICATIONS_PATH,
    capabilitiesFromScopes: appleCapabilitiesFromScopes,
    bindAdaptersForConnection: bindAppleAdaptersForConnection,
  },
];

export function buildProviderRegistry(
  config: SyncConfig,
  overrides: ProviderAdapterOverrides = {},
): ProviderRegistry {
  const registrations = new Map<ProviderKind, ProviderRegistration>();
  for (const {
    kind,
    isConfigured,
    buildAdapters,
    ...registration
  } of PROVIDER_BUILDERS) {
    const override = overrides[kind];
    // An injected auth adapter stands in for real provider config so tests can
    // register a provider the deployment has no credentials for.
    if (!isConfigured(config) && override?.auth === undefined) {
      continue;
    }
    registrations.set(kind, {
      ...registration,
      adapters: buildAdapters(config, override),
    });
  }
  return new ProviderRegistry(registrations);
}

export function resolveAdaptersFrom(
  registry: ProviderRegistry,
): ResolveProviderAdapters {
  return (kind, connection) => {
    const registration = registry.get(kind);
    let adapters = registration.adapters;
    if (connection && registration.bindAdaptersForConnection) {
      adapters = registration.bindAdaptersForConnection(connection, adapters);
    }
    return adapters;
  };
}

export function resolveAuthFrom(
  registry: ProviderRegistry,
): ResolveProviderAuth {
  return (kind) => registry.get(kind).adapters.auth;
}
