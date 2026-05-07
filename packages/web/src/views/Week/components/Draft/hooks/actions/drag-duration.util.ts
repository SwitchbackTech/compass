import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type Status_Drag } from "@web/views/Week/components/Draft/hooks/state/useDraftState";

export const getDragDurationMinutes = (
  draft: Schema_GridEvent,
  dragStatus: Status_Drag | null,
) => {
  return (
    dragStatus?.durationMin ??
    dayjs(draft.endDate).diff(draft.startDate, "minutes")
  );
};
