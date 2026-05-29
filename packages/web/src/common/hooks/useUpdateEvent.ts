import fastDeepEqual from "fast-deep-equal/es6";
import { useCallback } from "react";
import { type SliceStateContext } from "@web/common/store/helpers";
import { type Payload_EditEvent } from "@web/ducks/events/event.types";
import { selectEventEntities } from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { editEventSlice } from "@web/ducks/events/slices/event.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { type Schema_GridEvent } from "../types/web.event.types";

export function useUpdateEvent() {
  const dispatch = useAppDispatch();
  const eventEntities = useAppSelector(selectEventEntities);

  const update = useCallback(
    (
      payload: Omit<Payload_EditEvent & SliceStateContext, "_id">,
      saveImmediate = true,
    ) => {
      const { event } = payload;

      if (!event._id) return;

      dispatch(draftSlice.actions.setEvent(payload.event));

      if (!saveImmediate) return;

      const original = eventEntities[event._id] ?? {};
      const position = (event as Schema_GridEvent).position;
      const recurrence = event.recurrence;
      const equal = fastDeepEqual(event, { position, recurrence, ...original });

      if (equal) return;

      dispatch(editEventSlice.actions.request({ ...payload, _id: event._id }));
    },
    [dispatch, eventEntities],
  );

  return update;
}
