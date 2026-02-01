import { useCallback } from "react";
import { useSession } from "@web/auth/hooks/useSession";
import { useGoogleAuth } from "@web/common/hooks/useGoogleAuth";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch } from "@web/store/store.hooks";

export const useConnectGoogle = () => {
  const dispatch = useAppDispatch();
  const { authenticated } = useSession();
  const { login } = useGoogleAuth();

  const onConnectGoogleCalendar = useCallback(() => {
    login();
    dispatch(settingsSlice.actions.closeCmdPalette());
  }, [dispatch, login]);

  return {
    isGoogleCalendarConnected: authenticated,
    onConnectGoogleCalendar,
  };
};
