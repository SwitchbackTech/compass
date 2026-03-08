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
    (payload?: { eventsCount?: number; calendarsCount?: number } | string) => {
      dispatch(importGCalSlice.actions.importing(false));
      socket.emit(FETCH_USER_METADATA);

      if (!isImportPendingRef.current) {
        return;
      }

      // Parse payload if it's a string (from backend)
      let importResults: { eventsCount?: number; calendarsCount?: number } = {};
      if (typeof payload === "string") {
        try {
          importResults = JSON.parse(payload) as {
            eventsCount?: number;
            calendarsCount?: number;
          };
        } catch (e) {
          console.error("Failed to parse import results:", e);
          dispatch(
            importGCalSlice.actions.setImportError(
              "Failed to parse Google Calendar import results.",
            ),
          );
          return;
        }
      } else if (payload) {
        importResults = payload;
      }

      // Set import results to trigger completion results display
      dispatch(importGCalSlice.actions.setImportResults(importResults));

      // Trigger refetch to load imported events (no page reload)
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
