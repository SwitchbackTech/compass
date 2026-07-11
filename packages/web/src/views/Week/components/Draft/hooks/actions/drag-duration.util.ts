import dayjs from "@core/util/date/dayjs";
import { type GridScheduleDraft } from "@web/events/event-draft.types";
import { type Status_Drag } from "@web/views/Week/components/Draft/hooks/state/useDraftState";

export const getDragDurationMinutes = (
  schedule: GridScheduleDraft,
  dragStatus: Status_Drag | null,
) => {
  return (
    dragStatus?.durationMin ??
    dayjs(schedule.end).diff(schedule.start, "minutes")
  );
};
