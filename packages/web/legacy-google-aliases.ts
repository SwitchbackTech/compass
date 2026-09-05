import path from "node:path";

const src = path.resolve(import.meta.dir, "src");

/** Old Google connect specifiers that now live under auth/providers. */
export const LEGACY_GOOGLE_MODULE_ALIASES: Record<string, string> = {
  "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle": path.join(
    src,
    "auth/providers/useConnectProvider.ts",
  ),
  "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types": path.join(
    src,
    "auth/providers/connect.types.ts",
  ),
  "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util": path.join(
    src,
    "auth/providers/connect.util.ts",
  ),
  "@web/auth/google/hooks/useConnectGoogle/useGoogleUiState": path.join(
    src,
    "auth/providers/useProviderUiState.ts",
  ),
  "@web/auth/google/hooks/useDisconnectGoogleAccount": path.join(
    src,
    "auth/providers/useDisconnectAccount.ts",
  ),
  "@web/auth/google/hooks/useIsGoogleAvailable/useIsGoogleAvailable": path.join(
    src,
    "auth/providers/useIsProviderAvailable.ts",
  ),
  "@web/auth/google/state/google.reconnect.calendar": path.join(
    src,
    "auth/providers/reconnect.calendar.ts",
  ),
  "@web/auth/google/state/google.reconnect.state": path.join(
    src,
    "auth/providers/reconnect.state.ts",
  ),
  "@web/auth/google/state/google.sync.refresh": path.join(
    src,
    "auth/providers/sync.refresh.ts",
  ),
  "@web/auth/google/state/google.sync.state": path.join(
    src,
    "auth/providers/sync.indicator.state.ts",
  ),
  "@web/auth/google/util/google-revocation-api.config": path.join(
    src,
    "auth/providers/revocation-api.config.ts",
  ),
  "@web/auth/google/util/google.auth.util": path.join(
    src,
    "auth/providers/connection-revoked.util.ts",
  ),
  "@web/auth/google/util/google.auth.util.factory": path.join(
    src,
    "auth/providers/connection-revoked.util.factory.ts",
  ),
};
