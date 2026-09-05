import {
  type ConnectStatus,
  readConnectStatus,
  refreshUserMetadataAfterConnect,
  showConnectStatusToast,
} from "@web/auth/providers/connect-status.util";

export type GoogleConnectStatus = ConnectStatus;

export function readGoogleConnectStatus(
  search = window.location.search,
): GoogleConnectStatus | null {
  const redirect = readConnectStatus(search);
  return redirect?.provider === "google" ? redirect.status : null;
}

export function showGoogleConnectStatusToast(
  status: GoogleConnectStatus,
): void {
  showConnectStatusToast({ provider: "google", status });
}

export function refreshUserMetadataAfterGoogleConnect(
  status: GoogleConnectStatus,
): void {
  refreshUserMetadataAfterConnect(status);
}
