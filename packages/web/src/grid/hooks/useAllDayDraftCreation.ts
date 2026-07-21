import { type MouseEvent as ReactMouseEvent } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import dayjs from "@core/util/date/dayjs";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  allDayGridSchedule,
  createGridEventDraft,
  gridEventDraftToSchemaEvent,
} from "@web/events/grid-event-draft.adapter";
import {
  draftActions,
  selectIsDrafting,
  useDraftStore,
} from "@web/events/stores/draft.store";

interface UseAllDayDraftCreationOptions {
  getStartDate: (clientX: number, clientY: number) => string;
  onCreateDraft?: (event: CompassEvent) => void;
  onCreateGridDraft?: (draft: GridEventDraft) => void;
}

export const useAllDayDraftCreation = ({
  getStartDate,
  onCreateDraft,
  onCreateGridDraft,
}: UseAllDayDraftCreationOptions) => {
  const isDrafting = useDraftStore(selectIsDrafting);

  return (
    event: ReactMouseEvent<HTMLElement>,
    calendarId: CalendarId | null = null,
  ) => {
    if (isRightClick(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (isDrafting) {
      draftActions.discard();
      return;
    }

    const startDate = getStartDate(event.clientX, event.clientY);
    const endDate = dayjs(startDate)
      .add(1, "day")
      .format(YEAR_MONTH_DAY_FORMAT);

    const draft = createGridEventDraft(
      allDayGridSchedule(startDate, endDate),
      undefined,
      calendarId,
    );

    if (onCreateGridDraft) {
      onCreateGridDraft(draft);
      return;
    }

    onCreateDraft?.(gridEventDraftToSchemaEvent(draft));
  };
};
