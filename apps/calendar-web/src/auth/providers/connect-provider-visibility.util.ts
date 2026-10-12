import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { usesCredentialFormConnect } from "@web/auth/providers/provider-connect-flow.util";

/** OAuth redirect providers shown as primary connect buttons. */
export const primaryConnectProviderKinds = (
  kinds: readonly ProviderKind[],
): ProviderKind[] => kinds.filter((kind) => !usesCredentialFormConnect(kind));

export const showsICloudCredentialFallback = (
  kinds: readonly ProviderKind[],
): boolean => kinds.some((kind) => usesCredentialFormConnect(kind));
