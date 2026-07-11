import { type EventEmitter2 } from "eventemitter2";
import { useCallback, useEffect } from "react";
import { type Id } from "react-toastify";
import {
  type ImportResultMessage,
  type SyncStatusMessage,
  type UserMetadataMessage,
} from "@core/types/server-message.contracts";
import { type UserMetadata } from "@core/types/user.types";
import {
  clearGoogleSyncIndicatorOverride,
  getGoogleSyncIndicatorOverride,
  setSyncingSyncIndicatorOverride,
} from "@web/auth/google/state/google.sync.state";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";

export type GcalSSEDependencies = {
  handleGoogleRevoked: () => void;
  invalidateEventQueries: () => void;
  refreshUserMetadata: () => Promise<unknown> | unknown;
  setUserMetadata: (metadata: UserMetadata) => void;
  showErrorToast: (
    message: string | undefined,
    options: { toastId: Id },
  ) => void;
  sseEmitter: EventEmitter2;
};

export const createUseGcalSSE = (dependencies: GcalSSEDependencies) => {
  return function useGcalSSEWithDependencies() {
    // B10 folds import start/progress/end into syncStatusChanged
    // (syncing/healthy/attention) plus a separate importCompleted summary.
    const onSyncStatusChanged = useCallback((message: SyncStatusMessage) => {
      if (message.sync.status === "syncing") {
        if (getGoogleSyncIndicatorOverride() !== null) return;
        setSyncingSyncIndicatorOverride();
        return;
      }

      if (message.sync.status === "healthy") {
        clearGoogleSyncIndicatorOverride();
        return;
      }

      // attention
      clearGoogleSyncIndicatorOverride();

      if (message.sync.code === "GOOGLE_REVOKED") {
        dependencies.handleGoogleRevoked();
        return;
      }

      void dependencies.refreshUserMetadata();

      if (message.sync.code === "WATCH_REPAIR_FAILED") {
        dependencies.showErrorToast(undefined, {
          toastId: GOOGLE_REPAIR_FAILED_TOAST_ID,
        });
      }
    }, []);

    const onImportCompleted = useCallback((_message: ImportResultMessage) => {
      clearGoogleSyncIndicatorOverride();
      void dependencies.refreshUserMetadata();
      dependencies.invalidateEventQueries();
    }, []);

    const onUserMetadataChanged = useCallback(
      (message: UserMetadataMessage) => {
        // The backend replays the whole user-metadata payload here (packet-01
        // contract note); the web-side UserMetadata shape is still a plain
        // interface with no schema of its own to validate against.
        dependencies.setUserMetadata(message.metadata as UserMetadata);
      },
      [],
    );

    useEffect(() => {
      dependencies.sseEmitter.on("syncStatusChanged", onSyncStatusChanged);
      dependencies.sseEmitter.on("importCompleted", onImportCompleted);
      dependencies.sseEmitter.on("userMetadataChanged", onUserMetadataChanged);

      return () => {
        dependencies.sseEmitter.off("syncStatusChanged", onSyncStatusChanged);
        dependencies.sseEmitter.off("importCompleted", onImportCompleted);
        dependencies.sseEmitter.off(
          "userMetadataChanged",
          onUserMetadataChanged,
        );
      };
    }, [onSyncStatusChanged, onImportCompleted, onUserMetadataChanged]);
  };
};
