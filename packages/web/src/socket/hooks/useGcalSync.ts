import { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/websocket.constants";
import { UserMetadata } from "@core/types/user.types";
import { shouldImportGCal } from "@core/util/event/event.util";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import {
  selectAwaitingImportResults,
  selectImporting,
} from "@web/ducks/events/selectors/sync.selector";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { useAppSelector } from "@web/store/store.hooks";
import { socket } from "../client/socket.client";

export const useGcalSync = () => {
  const dispatch = useDispatch();
  const importing = useAppSelector(selectImporting);
  const awaitingImportResults = useAppSelector(selectAwaitingImportResults);

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
      if (!awaitingImportResults) {
        return;
      }

      // Parse payload if it's a string (from backend)
      let importResults: { eventsCount?: number; calendarsCount?: number } = {};
      if (typeof payload === "string") {
        try {
          importResults = JSON.parse(payload);
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
    [dispatch, awaitingImportResults],
  );

  const onMetadataFetch = useCallback(
    (metadata: UserMetadata) => {
      const importGcal = shouldImportGCal(metadata);
      const isBackendImporting = metadata.sync?.importGCal === "importing";

      if (awaitingImportResults) {
        if (isBackendImporting) {
          dispatch(importGCalSlice.actions.importing(true));
        }
        return;
      }

      // Normal case (not in post-auth flow) - sync state with backend
      onImportStart(isBackendImporting);

      if (importGcal) {
        dispatch(importGCalSlice.actions.request(undefined as never));
      }
    },
    [dispatch, awaitingImportResults, onImportStart],
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
