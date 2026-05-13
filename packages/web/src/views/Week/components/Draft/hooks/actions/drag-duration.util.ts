import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";

export interface DragDurationStatus {
  durationMin?: number | null;
}

export const getDragDurationMinutes = (
  draft: Schema_GridEvent,
  dragStatus: DragDurationStatus | null,
) => {
  return (
    dragStatus?.durationMin ??
    dayjs(draft.endDate).diff(draft.startDate, "minutes")
  );
};
