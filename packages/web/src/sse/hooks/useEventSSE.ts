import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/sse.constants";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { sseEmitter } from "../client/sse.client";

export const useEventSSE = () => {
  const dispatch = useDispatch();

  const onEventChanged = useCallback(
    (reason: Sync_AsyncStateContextReason) => {
      dispatch(triggerFetch({ reason }));
    },
    [dispatch],
  );

  useEffect(() => {
    const eventChangedHandler = () =>
      onEventChanged(Sync_AsyncStateContextReason.EVENT_CHANGED);

    const somedayChangedHandler = () =>
      onEventChanged(Sync_AsyncStateContextReason.SOMEDAY_EVENT_CHANGED);

    sseEmitter.on(EVENT_CHANGED, eventChangedHandler);
    sseEmitter.on(SOMEDAY_EVENT_CHANGED, somedayChangedHandler);

    return () => {
      sseEmitter.off(EVENT_CHANGED, eventChangedHandler);
      sseEmitter.off(SOMEDAY_EVENT_CHANGED, somedayChangedHandler);
    };
  }, [onEventChanged]);
};
