import { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  USER_METADATA,
} from "@core/constants/sse.constants";
import { type ImportGCalEndPayload } from "@core/types/sse.types";
import { type UserMetadata } from "@core/types/user.types";
import { handleGoogleRevoked } from "@web/auth/google/google.auth.util";
import { refreshUserMetadata } from "@web/auth/session/user-metadata.util";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { sseEmitter } from "../client/sse.client";

export const useGcalSSE = () => {
  const dispatch = useDispatch();

  const onImportEnd = useCallback(
    (payload?: ImportGCalEndPayload) => {
      if (payload?.operation === "REPAIR") {
        dispatch(importGCalSlice.actions.stopRepair());
      }
      void refreshUserMetadata();

      if (payload?.status === "ERRORED") {
        dispatch(importGCalSlice.actions.setImportError(payload.message));
        if (payload.operation === "REPAIR") {
          showErrorToast(payload.message, {
            toastId: GOOGLE_REPAIR_FAILED_TOAST_ID,
          });
        }
        return;
      }

      if (payload?.status === "IGNORED") {
        return;
      }

      if (payload?.status === "COMPLETED") {
        dispatch(
          importGCalSlice.actions.setImportResults({
            eventsCount: payload.eventsCount,
            calendarsCount: payload.calendarsCount,
          }),
        );
      }

      dispatch(
        triggerFetch({
          reason: Sync_AsyncStateContextReason.IMPORT_COMPLETE,
        }),
      );
    },
    [dispatch],
  );

  const onGoogleRevoked = useCallback(() => {
    dispatch(importGCalSlice.actions.stopRepair());
    handleGoogleRevoked();
  }, [dispatch]);

  const onMetadataFetch = useCallback(
    (metadata: UserMetadata) => {
      const importStatus = metadata.sync?.importGCal;
      const connectionState = metadata.google?.connectionState;
      const shouldAutoImport =
        importStatus === "RESTART" &&
        connectionState !== "RECONNECT_REQUIRED" &&
        connectionState !== "NOT_CONNECTED";

      dispatch(userMetadataSlice.actions.set(metadata));

      if (shouldAutoImport) {
        dispatch(importGCalSlice.actions.request());
      }
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

    const googleRevokedHandler = () => {
      onGoogleRevoked();
    };

    const userMetadataHandler = (e: Event) => {
      const metadata = JSON.parse(
        String((e as MessageEvent).data),
      ) as UserMetadata;
      onMetadataFetch(metadata);
    };

    sseEmitter.on(IMPORT_GCAL_END, importEndHandler);
    sseEmitter.on(GOOGLE_REVOKED, googleRevokedHandler);
    sseEmitter.on(USER_METADATA, userMetadataHandler);

    return () => {
      sseEmitter.off(IMPORT_GCAL_END, importEndHandler);
      sseEmitter.off(GOOGLE_REVOKED, googleRevokedHandler);
      sseEmitter.off(USER_METADATA, userMetadataHandler);
    };
  }, [onImportEnd, onGoogleRevoked, onMetadataFetch]);
};
