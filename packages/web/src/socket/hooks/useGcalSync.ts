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
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { socket } from "../client/socket.client";

/**
 * Hook to handle Google Calendar sync socket events.
 *
 * Note: The importing state is now derived from the server's connectionState
 * (via USER_METADATA). We no longer listen to IMPORT_GCAL_START since the
 * server metadata already contains the IMPORTING state.
 */
export const useGcalSync = () => {
  const dispatch = useDispatch();

  const onImportEnd = useCallback(
    (payload?: ImportGCalEndPayload) => {
      // Request fresh metadata from server to update connectionState
      socket.emit(FETCH_USER_METADATA);

      if (payload?.status === "ERRORED") {
        dispatch(importGCalSlice.actions.setImportError(payload.message));
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
    handleGoogleRevoked();
  }, []);

  const onMetadataFetch = useCallback(
    (metadata: UserMetadata) => {
      const importStatus = metadata.sync?.importGCal;
      const connectionState = metadata.google?.connectionState;
      const shouldAutoImport =
        importStatus === "RESTART" && connectionState !== "RECONNECT_REQUIRED";

      // Update Redux with server metadata (includes connectionState)
      dispatch(userMetadataSlice.actions.set(metadata));

      // Auto-trigger import if server indicates RESTART is needed
      if (shouldAutoImport) {
        dispatch(importGCalSlice.actions.request(undefined as never));
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
