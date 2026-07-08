import { useQueryClient } from "@tanstack/react-query";
import fastDeepEqual from "fast-deep-equal/es6";
import { useCallback } from "react";
import {
  type Payload_EditEvent,
  type SliceStateContext,
} from "@web/events/event.types";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { findEventInCache } from "@web/events/queries/event.query.cache";
import { draftActions } from "@web/events/stores/draft.store";
import { type Schema_GridEvent } from "../types/web.event.types";

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { edit } = useEventMutations();

  const update = useCallback(
    (
      payload: Omit<Payload_EditEvent & SliceStateContext, "_id">,
      saveImmediate = true,
    ) => {
      const { event } = payload;

      if (!event._id) return;

      draftActions.setEvent(payload.event);

      if (!saveImmediate) return;

      const original = findEventInCache(queryClient, event._id) ?? {};
      const position = (event as Schema_GridEvent).position;
      const recurrence = event.recurrence;
      const equal = fastDeepEqual(event, { position, recurrence, ...original });

      if (equal) return;

      edit({ ...payload, _id: event._id });
    },
    [edit, queryClient],
  );

  return update;
}
