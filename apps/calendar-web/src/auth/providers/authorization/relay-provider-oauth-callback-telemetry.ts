import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { providerAuthCallbackTelemetryPath } from "@web/auth/providers/authorization/provider-authorization.constants";
import { ENV_WEB } from "@web/common/constants/env.constants";

const TELEMETRY_HEADER = "X-Compass-OAuth-Telemetry";

/**
 * Records server-side OAuth callback funnel events on the backend using the
 * same query Google (or the provider) returned to the SPA callback route.
 */
export function relayProviderOAuthCallbackTelemetry(
  provider: ProviderKind,
  search: string,
): void {
  const query = search.startsWith("?") ? search : `?${search}`;
  const url = `${ENV_WEB.BACKEND_BASEURL}${providerAuthCallbackTelemetryPath(provider)}${query}`;

  try {
    void fetch(url, {
      method: "GET",
      credentials: "omit",
      headers: { [TELEMETRY_HEADER]: "1" },
      keepalive: true,
    });
  } catch {
    // Analytics must never block the OAuth callback UI.
  }
}
