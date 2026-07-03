import { type Id, type toast } from "react-toastify";
import { Origin } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";
import { type ApiError } from "@web/common/apis/api.types";
import {
  GOOGLE_REVOKED_TOAST_ID,
  toastDefaultOptions,
} from "@web/common/constants/toast.constants";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";

export interface SyncLocalEventsResult {
  syncedCount: number;
  success: boolean;
  error?: Error;
}

export const LOCAL_EVENTS_SYNC_ERROR_MESSAGE =
  "We could not sync your local events. Your changes are still saved on this device.";
export const LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE =
  "Your session expired before Compass could save your local events. Sign in again to continue. Your changes are still saved on this device.";

type GoogleAuthUtilDependencies = {
  closeStream: () => void;
  dispatch: (action: unknown) => unknown;
  isToastActive: (toastId: Id) => boolean;
  markGoogleAsRevoked: () => void;
  openStream: () => void;
  refreshEventRepositorySource: (sessionExists?: boolean) => void;
  removeEventsByOrigin: (origins: Origin[]) => void;
  removeEventQueries: () => void;
  syncLocalEventsToCloud: () => Promise<number>;
  toastError: typeof toast.error;
};

const getApiErrorStatus = (error: Error | undefined): number | undefined =>
  (error as ApiError | undefined)?.response?.status;

export function createGoogleAuthUtil({
  closeStream,
  dispatch,
  isToastActive,
  markGoogleAsRevoked,
  openStream,
  refreshEventRepositorySource,
  removeEventsByOrigin,
  removeEventQueries,
  syncLocalEventsToCloud,
  toastError,
}: GoogleAuthUtilDependencies) {
  const handleGoogleRevoked = () => {
    if (!isToastActive(GOOGLE_REVOKED_TOAST_ID)) {
      toastError("Google access revoked. Your Google data has been removed.", {
        toastId: GOOGLE_REVOKED_TOAST_ID,
        autoClose: false,
      });
    }

    markGoogleAsRevoked();
    // Source now resolves to "local"; re-key active queries so their next fetch
    // hits IndexedDB, then drop the stale remote cache entries.
    refreshEventRepositorySource();

    dispatch(authSlice.actions.resetAuth());
    dispatch(userMetadataSlice.actions.clear(undefined));

    removeEventsByOrigin([Origin.GOOGLE, Origin.GOOGLE_IMPORT]);
    removeEventQueries();

    closeStream();
    openStream();
  };

  const showLocalEventsSyncFailure = (error: Error | undefined) => {
    const status = getApiErrorStatus(error);
    const message =
      status === Status.UNAUTHORIZED
        ? LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE
        : LOCAL_EVENTS_SYNC_ERROR_MESSAGE;

    toastError(message, toastDefaultOptions);
    console.error(error);
  };

  const syncLocalEvents = async (): Promise<SyncLocalEventsResult> => {
    try {
      const syncedCount = await syncLocalEventsToCloud();
      return { syncedCount, success: true };
    } catch (error) {
      return { syncedCount: 0, success: false, error: error as Error };
    }
  };

  const syncPendingLocalEvents = async (): Promise<boolean> => {
    const syncResult = await syncLocalEvents();

    if (!syncResult.success) {
      showLocalEventsSyncFailure(syncResult.error);
      return false;
    }

    return true;
  };

  return {
    handleGoogleRevoked,
    showLocalEventsSyncFailure,
    syncLocalEvents,
    syncPendingLocalEvents,
  };
}
