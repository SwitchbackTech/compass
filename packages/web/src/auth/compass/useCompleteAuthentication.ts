import { syncPendingLocalEvents } from "@web/auth/google/util/google.auth.util";
import { useSession } from "@web/auth/session/useSession";
import {
  clearAnonymousCalendarChangeSignUpPrompt,
  markUserAsAuthenticated,
} from "@web/auth/state/auth.state.util";
import { refreshUserMetadata } from "@web/auth/user/util/user-metadata.util";
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
    clearAnonymousCalendarChangeSignUpPrompt();
    markUserAsAuthenticated(email);
    setAuthenticated(true);
    dispatch(authSuccess());

    void refreshUserMetadata();

    await syncPendingLocalEvents();

    dispatch(triggerFetch());
    onComplete?.();
  };
}
