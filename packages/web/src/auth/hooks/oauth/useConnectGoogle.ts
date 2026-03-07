import { useCallback } from "react";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { DEFAULT_GOOGLE_AUTH_STATUS } from "@web/ducks/auth/slices/auth.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

const getGoogleCalendarLabel = ({
  connectionStatus,
  syncStatus,
}: {
  connectionStatus: string;
  syncStatus: string;
}) => {
  if (connectionStatus === "reconnect_required") {
    return "Reconnect Google Calendar";
  }
  if (connectionStatus !== "connected") {
    return "Connect Google Calendar";
  }
  if (syncStatus === "repairing") {
    return "Syncing Google Calendar...";
  }
  if (syncStatus === "attention") {
    return "Repair Google Calendar";
  }
  return "Google Calendar Connected";
};

export const useConnectGoogle = () => {
  const dispatch = useAppDispatch();
  const googleStatus = useAppSelector(
    (state) => state.auth.google ?? DEFAULT_GOOGLE_AUTH_STATUS,
  );
  const { login } = useGoogleAuth();

  const onConnectGoogleCalendar = useCallback(() => {
    login();
    dispatch(settingsSlice.actions.closeCmdPalette());
  }, [dispatch, login]);

  const isGoogleCalendarConnected =
    googleStatus.connectionStatus === "connected" &&
    googleStatus.syncStatus === "healthy";
  const isGoogleCalendarActionDisabled =
    googleStatus.connectionStatus === "connected" &&
    googleStatus.syncStatus === "repairing";
  const googleCalendarLabel = getGoogleCalendarLabel(googleStatus);
  const googleCalendarIcon = isGoogleCalendarConnected
    ? "CheckCircleIcon"
    : isGoogleCalendarActionDisabled
      ? "ArrowPathIcon"
      : "CloudArrowUpIcon";

  return {
    googleCalendarIcon,
    googleCalendarLabel,
    isGoogleCalendarActionDisabled,
    isGoogleCalendarConnected,
    onConnectGoogleCalendar,
  };
};
