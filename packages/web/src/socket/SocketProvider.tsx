import { ReactNode, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
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
import { ENV_WEB } from "@web/common/constants/env.constants";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";

export const socket = io(ENV_WEB.BACKEND_BASEURL, {
  withCredentials: true,
  autoConnect: false,
  transports: ["websocket"],
});

export const reconnect = (_message: string) => {
  socket.disconnect();
  socket.connect();
};

export const onceConnected = () => {
  socket.emit(FETCH_USER_METADATA);
};

const onDisconnect = (_reason: string) => {};

export const onUserSignOut = () => {
  socket.disconnect();
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
socket.on("disconnect", onDisconnect);

const SocketProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch();

  const onImportStart = useCallback(
    (importing = true) => {
      dispatch(importGCalSlice.actions.importing(importing));
    },
    [dispatch],
  );

  const onImportEnd = useCallback(() => {
    dispatch(importGCalSlice.actions.importing(false));
  }, [dispatch]);

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

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  return children;
};

export default SocketProvider;
