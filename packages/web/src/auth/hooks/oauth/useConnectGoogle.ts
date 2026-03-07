import { useCallback } from "react";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { selectGoogleMetadata } from "@web/ducks/auth/selectors/user-metadata.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

export const useConnectGoogle = () => {
  const dispatch = useAppDispatch();
  const googleMetadata = useAppSelector(selectGoogleMetadata);
  const { login } = useGoogleAuth();

  const onOpenGoogleAuth = useCallback(() => {
    login();
    dispatch(settingsSlice.actions.closeCmdPalette());
  }, [dispatch, login]);

  const connectionStatus = googleMetadata?.connectionStatus ?? "not_connected";
  const syncStatus = googleMetadata?.syncStatus ?? "none";

  if (connectionStatus === "connected" && syncStatus === "repairing") {
    return {
      label: "Syncing Google Calendar...",
      icon: "ArrowPathIcon",
      isDisabled: true,
      onSelect: undefined,
    };
  }

  if (connectionStatus === "connected" && syncStatus === "attention") {
    return {
      label: "Repair Google Calendar",
      icon: "ArrowPathIcon",
      isDisabled: false,
      onSelect: onOpenGoogleAuth,
    };
  }

  if (connectionStatus === "connected" && syncStatus === "healthy") {
    return {
      label: "Google Calendar Connected",
      icon: "CheckCircleIcon",
      isDisabled: false,
      onSelect: undefined,
    };
  }

  if (connectionStatus === "reconnect_required") {
    return {
      label: "Reconnect Google Calendar",
      icon: "ArrowPathIcon",
      isDisabled: false,
      onSelect: onOpenGoogleAuth,
    };
  }

  return {
    label: "Connect Google Calendar",
    icon: "CloudArrowUpIcon",
    isDisabled: false,
    onSelect: onOpenGoogleAuth,
  };
};
