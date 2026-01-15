import { ReactNode, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  EVENT_CHANGED,
  FETCH_USER_METADATA,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  SOMEDAY_EVENT_CHANGED,
  USER_METADATA,
} from "@core/constants/websocket.constants";
import { UserMetadata } from "@core/types/user.types";
import { shouldImportGCal } from "@core/util/event/event.util";
import { useUser } from "@web/auth/useUser";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { useSession } from "@web/common/hooks/useSession";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { toastDefaultOptions } from "@web/views/Day/components/Toasts";

export const socket = io(ENV_WEB.BACKEND_BASEURL, {
  withCredentials: true,
  autoConnect: false,
  reconnection: false,
  closeOnBeforeunload: true,
  transports: ["websocket", "polling"],
});

export const disconnect = () => {
  socket.disconnect();
};

export const reconnect = (_message: string) => {
  disconnect();

  const timeout = setTimeout(() => {
    socket.connect();
    clearTimeout(timeout);
  }, 1000);
};

const onError = (error: unknown) => {
  console.error("Socket error:", error);
};

export const onceConnected = () => {
  socket.emit(FETCH_USER_METADATA);
};

const effectHandler =
  <T extends unknown[] = unknown[]>(
    event: string,
    callback: (...args: T) => void,
  ) =>
  () => {
    socket.on(event, callback);

    return () => {
      socket.removeListener(event, callback);
    };
  };

socket.once("connect", onceConnected);
socket.on("error", onError);

const SocketProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch();
  const { userId } = useUser();
  const { isSyncing, setIsSyncing } = useSession();

  // Only connect socket if user is authenticated
  useEffect(() => {
    if (userId && !socket.connected) {
      socket.connect();
    } else if (!userId && socket.connected) {
      socket.disconnect();
    }
  }, [userId]);

  const onImportStart = useCallback(
    (importing = true) => {
      dispatch(importGCalSlice.actions.importing(importing));
    },
    [dispatch],
  );

  const onImportEnd = useCallback(
    (payload?: { eventsCount?: number; calendarsCount?: number } | string) => {
      dispatch(importGCalSlice.actions.importing(false));

      // If we're in post-auth sync, show completion modal
      if (isSyncing) {
        setIsSyncing(false);

        // Parse payload if it's a string (from backend)
        let importResults: { eventsCount?: number; calendarsCount?: number } =
          {};
        if (typeof payload === "string") {
          try {
            importResults = JSON.parse(payload);
          } catch (e) {
            console.error("Failed to parse import results:", e);
          }
        } else if (payload) {
          importResults = payload;
        }

        // Set import results to trigger modal display
        dispatch(importGCalSlice.actions.setImportResults(importResults));

        // Trigger refetch to load imported events (no page reload)
        dispatch(
          triggerFetch({
            reason: Sync_AsyncStateContextReason.IMPORT_COMPLETE,
          }),
        );
      }
    },
    [dispatch, isSyncing, setIsSyncing],
  );

  const onEventChanged = useCallback(
    (reason: Sync_AsyncStateContextReason) => {
      dispatch(triggerFetch({ reason }));
    },
    [dispatch],
  );

  const onMetadataFetch = useCallback(
    (metadata: UserMetadata) => {
      const importGcal = shouldImportGCal(metadata);

      onImportStart(metadata.sync?.importGCal === "importing");

      if (importGcal) {
        dispatch(importGCalSlice.actions.request(undefined as never));
      }
    },
    [dispatch],
  );

  useEffect(
    effectHandler(EVENT_CHANGED, () =>
      onEventChanged(Sync_AsyncStateContextReason.SOCKET_EVENT_CHANGED),
    ),
    [onEventChanged],
  );

  useEffect(
    effectHandler(SOMEDAY_EVENT_CHANGED, () =>
      onEventChanged(Sync_AsyncStateContextReason.SOCKET_SOMEDAY_EVENT_CHANGED),
    ),
    [onEventChanged],
  );

  useEffect(effectHandler(USER_METADATA, onMetadataFetch), [onMetadataFetch]);

  useEffect(effectHandler(IMPORT_GCAL_START, onImportStart), [onImportStart]);

  useEffect(effectHandler(IMPORT_GCAL_END, onImportEnd), [onImportEnd]);

  return children;
};

export default SocketProvider;
