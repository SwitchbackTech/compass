import {
  type ProviderKind,
  providerDisplayName,
} from "@core/types/sync/identity.contracts";
import { type SyncConnectionSummary } from "@core/types/user.types";

export const ALL_PROVIDER_KINDS: ProviderKind[] = [
  "google",
  "microsoft",
  "apple",
];

/** Missing `provider` on legacy payloads means Google. */
export const connectionProviderKind = (
  connection?: Pick<SyncConnectionSummary, "provider"> | null,
): ProviderKind => connection?.provider ?? "google";

export const openingProviderLabel = (kind: ProviderKind): string =>
  `Opening ${providerDisplayName(kind)}…`;
