import { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  FETCH_USER_METADATA,
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  USER_METADATA,
} from "@core/constants/websocket.constants";
import { type UserMetadata } from "@core/types/user.types";
import { type ImportGCalEndPayload } from "@core/types/websocket.types";
import { handleGoogleRevoked } from "@web/auth/google/google.auth.util";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { socket } from "../client/socket.client";

export const useGcalSync = () => {
  const dispatch = useDispatch();

  const onImportEnd = useCallback(
    (payload?: ImportGCalEndPayload) => {
      if (payload?.operation === "REPAIR") {
        dispatch(importGCalSlice.actions.stopRepair());
      }
      socket.emit(FETCH_USER_METADATA);

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
    socket.on(USER_METADATA, onMetadataFetch);
    return () => {
      socket.removeListener(USER_METADATA, onMetadataFetch);
    };
  }, [onMetadataFetch]);

  useEffect(() => {
    socket.on(IMPORT_GCAL_END, onImportEnd);
    return () => {
      socket.removeListener(IMPORT_GCAL_END, onImportEnd);
    };
  }, [onImportEnd]);

  useEffect(() => {
    socket.on(GOOGLE_REVOKED, onGoogleRevoked);
    return () => {
      socket.removeListener(GOOGLE_REVOKED, onGoogleRevoked);
    };
  }, [onGoogleRevoked]);
};
