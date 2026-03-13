import { useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  FETCH_USER_METADATA,
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/websocket.constants";
import { type UserMetadata } from "@core/types/user.types";
import { type ImportGCalEndPayload } from "@core/types/websocket.types";
import { handleGoogleRevoked } from "@web/auth/google/google.auth.util";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { selectIsImportPending } from "@web/ducks/events/selectors/sync.selector";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { useAppSelector } from "@web/store/store.hooks";
import { socket } from "../client/socket.client";

export const useGcalSync = () => {
  const dispatch = useDispatch();
  const isImportPending = useAppSelector(selectIsImportPending);

  // Keep ref in sync synchronously during render to avoid race with socket events
  const isImportPendingRef = useRef(isImportPending);
  isImportPendingRef.current = isImportPending;

  const onImportStart = useCallback(
    (importing = true) => {
      if (importing) {
        dispatch(importGCalSlice.actions.clearImportResults(undefined));
      }
      dispatch(importGCalSlice.actions.importing(importing));
    },
    [dispatch],
  );

  const onImportEnd = useCallback(
    (payload?: ImportGCalEndPayload) => {
      dispatch(importGCalSlice.actions.importing(false));
      socket.emit(FETCH_USER_METADATA);

      if (!isImportPendingRef.current) {
        return;
      }

      if (payload?.status === "errored") {
        dispatch(importGCalSlice.actions.setImportError(payload.message));
        return;
      }

      if (payload?.status === "ignored") {
        return;
      }

      if (payload?.status === "completed") {
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
    handleGoogleRevoked();
  }, []);

  const onMetadataFetch = useCallback(
    (metadata: UserMetadata) => {
      const importStatus = metadata.sync?.importGCal;
      const isBackendImporting = importStatus === "importing";
      const shouldAutoImport = importStatus === "restart";

      dispatch(userMetadataSlice.actions.set(metadata));

      if (isImportPendingRef.current) {
        if (isBackendImporting) {
          dispatch(importGCalSlice.actions.importing(true));
        } else if (importStatus === "completed") {
          dispatch(importGCalSlice.actions.importing(false));
          dispatch(importGCalSlice.actions.setIsImportPending(false));
          dispatch(
            triggerFetch({
              reason: Sync_AsyncStateContextReason.IMPORT_COMPLETE,
            }),
          );
        } else if (importStatus === "errored") {
          dispatch(importGCalSlice.actions.importing(false));
          dispatch(importGCalSlice.actions.setIsImportPending(false));
        }
        return;
      }

      // Normal case (not in post-auth flow) - sync state with backend
      onImportStart(isBackendImporting);

      if (shouldAutoImport) {
        dispatch(importGCalSlice.actions.request(undefined as never));
      }
    },
    [dispatch, onImportStart],
  );

  useEffect(() => {
    socket.on(USER_METADATA, onMetadataFetch);
    return () => {
      socket.removeListener(USER_METADATA, onMetadataFetch);
    };
  }, [onMetadataFetch]);

  useEffect(() => {
    socket.on(IMPORT_GCAL_START, onImportStart);
    return () => {
      socket.removeListener(IMPORT_GCAL_START, onImportStart);
    };
  }, [onImportStart]);

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
