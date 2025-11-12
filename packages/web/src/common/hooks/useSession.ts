import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { debounceTime } from "rxjs/operators";
import { session } from "@web/common/classes/Session";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import * as socket from "@web/socket/SocketProvider";

export function useSession() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>();
  const [authenticated, setAuthenticated] = useState<boolean>();

  const checkAuth = useCallback(() => {
    setLoading(true);

    session
      .doesSessionExist()
      .then((exists) => {
        setAuthenticated(exists);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    checkAuth();

    const subscription = session.events
      .pipe(debounceTime(1000))
      .subscribe((e) => {
        checkAuth();

        switch (e.action) {
          case "REFRESH_SESSION":
          case "SESSION_CREATED":
            socket.reconnect(e.action);
            break;
          case "SIGN_OUT":
            socket.onUserSignOut();
            break;
        }
      });

    return () => subscription.unsubscribe();
  }, [checkAuth]);

  useEffect(() => {
    if (authenticated === false) {
      navigate(ROOT_ROUTES.LOGIN);
    }
  }, [authenticated, navigate]);

  return { authenticated, loading };
}
