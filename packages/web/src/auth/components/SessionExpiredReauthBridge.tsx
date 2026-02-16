import { useEffect } from "react";
import { useConnectGoogle } from "@web/auth/hooks/oauth/useConnectGoogle";
import { SESSION_EXPIRED_REAUTH_EVENT } from "@web/common/utils/toast/error-toast.util";

export const SessionExpiredReauthBridge = () => {
  const { onConnectGoogleCalendar } = useConnectGoogle();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleReconnect = () => {
      onConnectGoogleCalendar();
    };

    window.addEventListener(SESSION_EXPIRED_REAUTH_EVENT, handleReconnect);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_REAUTH_EVENT, handleReconnect);
    };
  }, [onConnectGoogleCalendar]);

  return null;
};
