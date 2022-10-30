import { useDispatch } from "react-redux";
import { Origin } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { removeGridFields } from "@web/common/utils/grid.util";
import {
  editEventSlice,
  createEventSlice,
} from "@web/ducks/events/event.slice";

export const useDraftUtils = () => {
  const dispatch = useDispatch();

  const prepareEvent = (
    draft: Schema_GridEvent,
    original?: Schema_GridEvent
  ) => {
    let eventToClean: Schema_GridEvent = { ...original };
    if (!original) {
      eventToClean = { ...draft };
    }

    const _event = removeGridFields(eventToClean);
    const event = { ..._event, origin: Origin.COMPASS } as Schema_Event;

    return event;
  };

  const submit = (draft: Schema_GridEvent) => {
    const event = prepareEvent(draft);

    const isExisting = event._id;
    if (isExisting) {
      dispatch(
        editEventSlice.actions.request({
          _id: event._id,
          event,
        })
      );
    } else {
      dispatch(createEventSlice.actions.request(event));
    }
  };

  return { submit };
};
