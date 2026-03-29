import { syncPendingLocalEvents } from "@web/auth/google/google.auth.util";
import { useSession } from "@web/auth/hooks/session/useSession";
import { refreshUserMetadata } from "@web/auth/session/user-metadata.util";
import { markUserAsAuthenticated } from "@web/auth/state/auth.state.util";
import { authSuccess } from "@web/ducks/auth/slices/auth.slice";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { useAppDispatch } from "@web/store/store.hooks";

export function useCompleteAuthentication() {
  const dispatch = useAppDispatch();
  const { setAuthenticated } = useSession();

  return async ({
    email,
    onComplete,
  }: {
    email?: string;
    onComplete?: () => void;
  }) => {
    markUserAsAuthenticated(email);
    setAuthenticated(true);
    dispatch(authSuccess());

    void refreshUserMetadata();

    await syncPendingLocalEvents(dispatch);

    dispatch(triggerFetch());
    onComplete?.();
  };
}
