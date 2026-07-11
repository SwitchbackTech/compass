import { type Id, type toast } from "react-toastify";
import { Status } from "@core/errors/status.codes";
import { type ApiError } from "@web/api/api.types";
import {
  GOOGLE_REVOKED_TOAST_ID,
  toastDefaultOptions,
} from "@web/common/constants/toast.constants";
export interface SyncLocalEventsResult {
  syncedCount: number;
  success: boolean;
  error?: Error;
}

export const LOCAL_EVENTS_SYNC_ERROR_MESSAGE =
  "We couldn't save your events to the cloud. Your changes are still safe on this device.";
export const LOCAL_EVENTS_SYNC_SESSION_EXPIRED_MESSAGE =
  "You were signed out before Compass could save your events to the cloud. Sign in again to finish — your changes are still safe on this device.";

type GoogleAuthUtilDependencies = {
  clearUserMetadata: () => void;
  closeStream: () => void;
  isToastActive: (toastId: Id) => boolean;
  markGoogleAsRevoked: () => void;
  openStream: () => void;
  refreshEventRepositorySource: (sessionExists?: boolean) => void;
  // B14: drops cached events belonging to a google-provider calendar (by id),
  // replacing the legacy origin-based prune.
  removeEventsByGoogleCalendars: () => void;
  removeEventQueries: () => void;
  syncLocalEventsToCloud: () => Promise<number>;
  toastError: typeof toast.error;
};

const getApiErrorStatus = (error: Error | undefined): number | undefined =>
  (error as ApiError | undefined)?.response?.status;

export function createGoogleAuthUtil({
  clearUserMetadata,
  closeStream,
  isToastActive,
  markGoogleAsRevoked,
  openStream,
  refreshEventRepositorySource,
  removeEventsByGoogleCalendars,
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

    clearUserMetadata();

    removeEventsByGoogleCalendars();
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
