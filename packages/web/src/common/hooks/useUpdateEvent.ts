import { getEntity } from "@ngneat/elf-entities";
import fastDeepEqual from "fast-deep-equal/es6";
import { useCallback } from "react";
import { type Schema_Event, type WithCompassId } from "@core/types/event.types";
import { type SliceStateContext } from "@web/common/store/helpers";
import { type Payload_EditEvent } from "@web/ducks/events/event.types";
import { editEventSlice } from "@web/ducks/events/slices/event.slice";
import { eventsStore, setDraft } from "@web/store/events";
import { useAppDispatch } from "@web/store/store.hooks";
import { type Schema_GridEvent } from "../types/web.event.types";

export function useUpdateEvent() {
  const dispatch = useAppDispatch();

  const update = useCallback(
    (
      payload: Omit<Payload_EditEvent & SliceStateContext, "_id">,
      saveImmediate = true,
    ) => {
      const { event } = payload;

      if (!event._id) return;

      setDraft(payload.event as WithCompassId<Schema_Event>);

      if (!saveImmediate) return;

      const original = eventsStore.query(getEntity(event._id));
      const position = (event as Schema_GridEvent).position;
      const recurrence = event.recurrence;
      const equal = fastDeepEqual(event, { position, recurrence, ...original });

      if (equal) return;

      dispatch(editEventSlice.actions.request({ ...payload, _id: event._id }));
    },
    [dispatch],
  );

  return update;
}
