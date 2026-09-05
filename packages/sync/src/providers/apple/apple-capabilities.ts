import { type ProviderCapability } from "@core/types/sync/identity.contracts";

export const APPLE_PROVIDER_CAPABILITIES: readonly ProviderCapability[] = [
  "readEvents",
  "writeEvents",
  "readBusy",
  "inviteAttendees",
  "incrementalChanges",
];
