import { toast } from "react-toastify";
import { syncLocalEvents } from "@web/auth/google/google.auth.util";
import { useSession } from "@web/auth/hooks/session/useSession";
import { refreshUserMetadata } from "@web/auth/session/user-metadata.util";
import { markUserAsAuthenticated } from "@web/auth/state/auth.state.util";
import { toastDefaultOptions } from "@web/common/constants/toast.constants";
import { authSuccess } from "@web/ducks/auth/slices/auth.slice";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
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

    const syncResult = await syncLocalEvents();

    if (syncResult.success && syncResult.syncedCount > 0) {
      dispatch(
        importGCalSlice.actions.setLocalEventsSynced(syncResult.syncedCount),
      );
    } else if (!syncResult.success) {
      toast.error(
        "We could not sync your local events. Your changes are still saved on this device.",
        toastDefaultOptions,
      );
      console.error(syncResult.error);
    }

    dispatch(triggerFetch());
    onComplete?.();
  };
}
