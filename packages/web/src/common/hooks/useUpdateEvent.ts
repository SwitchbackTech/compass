import { useCallback } from "react";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import { SliceStateContext } from "@web/common/store/helpers";
import { Payload_EditEvent } from "@web/ducks/events/event.types";
import { editEventSlice } from "@web/ducks/events/slices/event.slice";
import { setDraft } from "@web/store/events";
import { useAppDispatch } from "@web/store/store.hooks";

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

      dispatch(editEventSlice.actions.request({ ...payload, _id: event._id }));
    },
    [dispatch],
  );

  return update;
}
