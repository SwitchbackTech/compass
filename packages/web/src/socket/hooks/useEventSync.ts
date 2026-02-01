import { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/websocket.constants";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { socket } from "../client/socket.client";

export const useEventSync = () => {
  const dispatch = useDispatch();

  const onEventChanged = useCallback(
    (reason: Sync_AsyncStateContextReason) => {
      dispatch(triggerFetch({ reason }));
    },
    [dispatch],
  );

  useEffect(() => {
    const handler = () =>
      onEventChanged(Sync_AsyncStateContextReason.SOCKET_EVENT_CHANGED);
    socket.on(EVENT_CHANGED, handler);
    return () => {
      socket.removeListener(EVENT_CHANGED, handler);
    };
  }, [onEventChanged]);

  useEffect(() => {
    const handler = () =>
      onEventChanged(Sync_AsyncStateContextReason.SOCKET_SOMEDAY_EVENT_CHANGED);
    socket.on(SOMEDAY_EVENT_CHANGED, handler);
    return () => {
      socket.removeListener(SOMEDAY_EVENT_CHANGED, handler);
    };
  }, [onEventChanged]);
};
