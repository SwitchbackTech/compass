import { type FC } from "react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { getCalendarConnectionBannerKind } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { CalendarConnectionBanner } from "@web/components/CalendarConnectionBanner/CalendarConnectionBanner";

export const CalendarConnectionBannerGate: FC = () => {
  const { connect, connection, refresh, state } = useConnectGoogle();
  const kind = getCalendarConnectionBannerKind(state, connection);
  if (!kind) return null;

  return (
    <CalendarConnectionBanner
      kind={kind}
      onAction={kind === "reconnect" ? connect : () => refresh()}
    />
  );
};
