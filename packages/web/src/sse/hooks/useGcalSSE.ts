import { useCallback, useEffect } from "react";
import {
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/sse.constants";
import { type ImportGCalEndPayload } from "@core/types/sse.types";
import { type UserMetadata } from "@core/types/user.types";
import {
  clearGoogleSyncIndicatorOverride,
  getGoogleSyncIndicatorOverride,
  setSyncingSyncIndicatorOverride,
} from "@web/auth/google/state/google.sync.state";
import { handleGoogleRevoked } from "@web/auth/google/util/google.auth.util";
import { refreshUserMetadata } from "@web/auth/user/util/user-metadata.util";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { sseEmitter } from "../client/sse.client";

export const useGcalSSE = () => {
  const dispatch = useAppDispatch();

  const onImportEnd = useCallback(
    (payload?: ImportGCalEndPayload) => {
      clearGoogleSyncIndicatorOverride();

      if (payload?.status === "ERRORED") {
        void refreshUserMetadata();
        if (payload.operation === "REPAIR") {
          showErrorToast(payload.message, {
            toastId: GOOGLE_REPAIR_FAILED_TOAST_ID,
          });
        }
        return;
      }

      if (payload?.status === "IGNORED") {
        void refreshUserMetadata();
        return;
      }

      void refreshUserMetadata();
      dispatch(
        triggerFetch({
          reason: Sync_AsyncStateContextReason.IMPORT_COMPLETE,
        }),
      );
    },
    [dispatch],
  );

  const onImportStart = useCallback(() => {
    if (getGoogleSyncIndicatorOverride() !== null) {
      return;
    }

    setSyncingSyncIndicatorOverride();
  }, []);

  const onGoogleRevoked = useCallback(() => {
    clearGoogleSyncIndicatorOverride();
    handleGoogleRevoked();
  }, []);

  const onMetadataFetch = useCallback(
    (metadata: UserMetadata) => {
      dispatch(userMetadataSlice.actions.set(metadata));
    },
    [dispatch],
  );

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

    sseEmitter.on(IMPORT_GCAL_START, importStartHandler);
    sseEmitter.on(IMPORT_GCAL_END, importEndHandler);
    sseEmitter.on(GOOGLE_REVOKED, googleRevokedHandler);
    sseEmitter.on(USER_METADATA, userMetadataHandler);

    return () => {
      sseEmitter.off(IMPORT_GCAL_START, importStartHandler);
      sseEmitter.off(IMPORT_GCAL_END, importEndHandler);
      sseEmitter.off(GOOGLE_REVOKED, googleRevokedHandler);
      sseEmitter.off(USER_METADATA, userMetadataHandler);
    };
  }, [onImportEnd, onImportStart, onGoogleRevoked, onMetadataFetch]);
};
