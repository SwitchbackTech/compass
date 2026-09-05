import { type FC } from "react";
import { getCalendarConnectionBannerKind } from "@web/auth/providers/connect.util";
import { connectionProviderKind } from "@web/auth/providers/connection-provider.util";
import { useConnectProvider } from "@web/auth/providers/useConnectProvider";
import {
  selectPrimaryGoogleSyncConnection,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { CalendarConnectionBanner } from "@web/components/CalendarConnectionBanner/CalendarConnectionBanner";

export const CalendarConnectionBannerGate: FC = () => {
  const primaryConnection = useUserMetadataStore(
    selectPrimaryGoogleSyncConnection,
  );
  const provider = connectionProviderKind(primaryConnection);
  const { connect, connection, refresh, state } = useConnectProvider(
    provider,
    primaryConnection ? { connection: primaryConnection } : undefined,
  );
  const kind = getCalendarConnectionBannerKind(state, connection);
  if (!kind) return null;

  return (
    <CalendarConnectionBanner
      kind={kind}
      onAction={kind === "reconnect" ? connect : () => refresh()}
      provider={connectionProviderKind(connection)}
    />
  );
};
