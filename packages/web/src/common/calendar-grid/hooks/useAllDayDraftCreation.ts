import { type MouseEvent as ReactMouseEvent } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { assembleDefaultEvent } from "@web/common/utils/event/event.util";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

interface UseAllDayDraftCreationOptions {
  getStartDate: (clientX: number, clientY: number) => string;
  onCreateDraft: (event: Schema_Event) => void;
}

export const useAllDayDraftCreation = ({
  getStartDate,
  onCreateDraft,
}: UseAllDayDraftCreationOptions) => {
  const dispatch = useAppDispatch();
  const isDrafting = useAppSelector(selectIsDrafting);

  return (event: ReactMouseEvent<HTMLElement>) => {
    if (isRightClick(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (isDrafting) {
      dispatch(draftSlice.actions.discard(undefined));
      return;
    }

    const startDate = getStartDate(event.clientX, event.clientY);
    const endDate = dayjs(startDate)
      .add(1, "day")
      .format(YEAR_MONTH_DAY_FORMAT);

    void assembleDefaultEvent(Categories_Event.ALLDAY, startDate, endDate).then(
      onCreateDraft,
    );
  };
};
