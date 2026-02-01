import { useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/websocket.constants";
import { UserMetadata } from "@core/types/user.types";
import { shouldImportGCal } from "@core/util/event/event.util";
import { useSession } from "@web/auth/hooks/useSession";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { selectImporting } from "@web/ducks/events/selectors/sync.selector";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { useAppSelector } from "@web/store/store.hooks";
import { socket } from "../client/socket.client";

export const useGcalSync = () => {
  const dispatch = useDispatch();
  const { isSyncing, setIsSyncing } = useSession();
  const importStartedRef = useRef(false);
  const importing = useAppSelector(selectImporting);

  useEffect(() => {
    if (importing) {
      importStartedRef.current = true;
    }
  }, [importing]);

  const onImportStart = useCallback(
    (importing = true) => {
      importStartedRef.current = importing;
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
      const shouldShowResults = isSyncing && importStartedRef.current;
      importStartedRef.current = false;

      // If we're in post-auth sync, show completion
      if (isSyncing) {
        setIsSyncing(false);
      }

      if (!shouldShowResults) {
        return;
      }

      // Parse payload if it's a string (from backend)
      let importResults: { eventsCount?: number; calendarsCount?: number } = {};
      if (typeof payload === "string") {
        try {
          importResults = JSON.parse(payload);
        } catch (e) {
          console.error("Failed to parse import results:", e);
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
    [dispatch, isSyncing, setIsSyncing],
  );

  const onMetadataFetch = useCallback(
    (metadata: UserMetadata) => {
      const importGcal = shouldImportGCal(metadata);
      const isBackendImporting = metadata.sync?.importGCal === "importing";

      // When we're in post-auth flow (isSyncing=true), handle state carefully
      if (isSyncing) {
        if (isBackendImporting) {
          // Backend still importing - ensure frontend shows importing state
          dispatch(importGCalSlice.actions.importing(true));
        } else {
          // Import completed while we were connecting - complete the flow

          // FIX: race condition where USER_METADATA fires before IMPORT_GCAL_END
          // If we think we are importing, we wait for IMPORT_GCAL_END
          if (importStartedRef.current) {
            return;
          }

          dispatch(importGCalSlice.actions.importing(false));
          setIsSyncing(false);
        }
        return;
      }

      // Normal case (not in post-auth flow) - sync state with backend
      onImportStart(isBackendImporting);

      if (importGcal) {
        dispatch(importGCalSlice.actions.request(undefined as never));
      }
    },
    [dispatch, isSyncing, setIsSyncing, onImportStart],
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
};
