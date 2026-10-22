import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { providerAuthCallbackPath } from "@web/auth/providers/authorization/provider-authorization.constants";

export function isProviderAuthCallbackPath(
  pathname: string,
  provider?: ProviderKind,
): boolean {
  if (provider) {
    return pathname === providerAuthCallbackPath(provider);
  }
  return pathname.startsWith("/auth/") && pathname.endsWith("/callback");
}
