import { useQueryClient } from "@tanstack/react-query";
import fastDeepEqual from "fast-deep-equal/es6";
import { useCallback } from "react";
import { type SliceStateContext } from "@web/common/store/helpers";
import { type Payload_EditEvent } from "@web/ducks/events/event.types";
import { useEventMutations } from "@web/ducks/events/mutations/useEventMutations";
import { findEventInCache } from "@web/ducks/events/queries/event.query.cache";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { type Schema_GridEvent } from "../types/web.event.types";

export function useUpdateEvent() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { edit } = useEventMutations();

  const update = useCallback(
    (
      payload: Omit<Payload_EditEvent & SliceStateContext, "_id">,
      saveImmediate = true,
    ) => {
      const { event } = payload;

      if (!event._id) return;

      dispatch(draftSlice.actions.setEvent(payload.event));

      if (!saveImmediate) return;

      const original = findEventInCache(queryClient, event._id) ?? {};
      const position = (event as Schema_GridEvent).position;
      const recurrence = event.recurrence;
      const equal = fastDeepEqual(event, { position, recurrence, ...original });

      if (equal) return;

      edit({ ...payload, _id: event._id });
    },
    [dispatch, edit, queryClient],
  );

  return update;
}
