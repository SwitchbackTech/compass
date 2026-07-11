import { type EventEmitter2 } from "eventemitter2";
import { useCallback, useEffect } from "react";
import { type Id } from "react-toastify";
import { type ImportGCalEndPayload } from "@core/types/sse.types";
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
    const onImportEnd = useCallback((payload?: ImportGCalEndPayload) => {
      clearGoogleSyncIndicatorOverride();

      if (payload?.status === "ERRORED") {
        void dependencies.refreshUserMetadata();
        if (payload.operation === "REPAIR") {
          dependencies.showErrorToast(payload.message, {
            toastId: GOOGLE_REPAIR_FAILED_TOAST_ID,
          });
        }
        return;
      }

      if (payload?.status === "IGNORED") {
        void dependencies.refreshUserMetadata();
        return;
      }

      void dependencies.refreshUserMetadata();
      dependencies.invalidateEventQueries();
    }, []);

    const onImportStart = useCallback(() => {
      if (getGoogleSyncIndicatorOverride() !== null) {
        return;
      }

      setSyncingSyncIndicatorOverride();
    }, []);

    const onGoogleRevoked = useCallback(() => {
      clearGoogleSyncIndicatorOverride();
      dependencies.handleGoogleRevoked();
    }, []);

    const onMetadataFetch = useCallback((metadata: UserMetadata) => {
      dependencies.setUserMetadata(metadata);
    }, []);

    useEffect(() => {
      const importEndHandler = (e: Event) => {
        const payload = JSON.parse(
          String((e as MessageEvent).data),
        ) as ImportGCalEndPayload;
        onImportEnd(payload);
      };

      const importStartHandler = () => {
        onImportStart();
      };

      const googleRevokedHandler = () => {
        onGoogleRevoked();
      };

      const userMetadataHandler = (e: Event) => {
        const metadata = JSON.parse(
          String((e as MessageEvent).data),
        ) as UserMetadata;
        onMetadataFetch(metadata);
      };

      // TODO(packet-03-phase-3): these listener names no longer match what
      // the backend publishes (B10: syncStatusChanged/importCompleted/
      // userMetadataChanged, single "message" event carrying a
      // ServerMessageSchema member). Rewire onImportStart/onImportEnd/
      // onGoogleRevoked/onMetadataFetch against the new message shapes.
      dependencies.sseEmitter.on("syncStatusChanged", importStartHandler);
      dependencies.sseEmitter.on("importCompleted", importEndHandler);
      dependencies.sseEmitter.on("syncStatusChanged", googleRevokedHandler);
      dependencies.sseEmitter.on("userMetadataChanged", userMetadataHandler);

      return () => {
        dependencies.sseEmitter.off("syncStatusChanged", importStartHandler);
        dependencies.sseEmitter.off("importCompleted", importEndHandler);
        dependencies.sseEmitter.off("syncStatusChanged", googleRevokedHandler);
        dependencies.sseEmitter.off("userMetadataChanged", userMetadataHandler);
      };
    }, [onImportEnd, onImportStart, onGoogleRevoked, onMetadataFetch]);
  };
};
