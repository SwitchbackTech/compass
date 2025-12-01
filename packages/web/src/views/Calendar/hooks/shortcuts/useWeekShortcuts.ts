import { useCallback } from "react";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import { Dayjs } from "@core/util/date/dayjs";
import {
  useKeyDownEvent,
  useKeyUpEvent,
} from "@web/common/hooks/useKeyboardEvent";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";
import {
  selectIsSidebarOpen,
  selectSidebarTab,
} from "@web/ducks/events/selectors/view.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Util_Scroll } from "@web/views/Calendar/hooks/grid/useScroll";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";

export interface ShortcutProps {
  today: Dayjs;
  dateCalcs: DateCalcs;
  isCurrentWeek: boolean;
  startOfView: Dayjs;
  endOfView: Dayjs;
  util: WeekProps["util"];
  scrollUtil: Util_Scroll;
}

export const useWeekShortcuts = ({
  isCurrentWeek,
  startOfView,
  endOfView,
  util,
  scrollUtil,
}: ShortcutProps) => {
  const dispatch = useAppDispatch();
  const context = useSidebarContext(true);

  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const tab = useAppSelector(selectSidebarTab);
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);
  const { decrementWeek, incrementWeek, goToToday } = util;
  const { scrollToNow } = scrollUtil;

  const _createSomedayDraft = useCallback(
    async (
      category: Categories_Event.SOMEDAY_WEEK | Categories_Event.SOMEDAY_MONTH,
    ) => {
      if (category === Categories_Event.SOMEDAY_WEEK && isAtWeeklyLimit) {
        alert(SOMEDAY_WEEK_LIMIT_MSG);
        return;
      }
      if (category === Categories_Event.SOMEDAY_MONTH && isAtMonthlyLimit) {
        alert(SOMEDAY_MONTH_LIMIT_MSG);
        return;
      }

      context?.actions.createSomedayDraft(category, "createShortcut");

      // If sidebar is closed, open it first
      if (!isSidebarOpen) {
        dispatch(viewSlice.actions.toggleSidebar());
      }

      if (tab !== "tasks") {
        dispatch(viewSlice.actions.updateSidebarTab("tasks"));
      }
    },
    [context, isAtMonthlyLimit, isAtWeeklyLimit, isSidebarOpen, tab, dispatch],
  );

  const _discardDraft = useCallback(() => {
    if (isEventFormOpen()) {
      dispatch(draftSlice.actions.discard(undefined));
    }
  }, [dispatch]);

  const openTasks = useCallback(() => {
    dispatch(viewSlice.actions.updateSidebarTab("tasks"));
  }, [dispatch]);

  const openMonthWidget = useCallback(() => {
    dispatch(viewSlice.actions.updateSidebarTab("monthWidget"));
  }, [dispatch]);

  const goToPreviousWeek = useCallback(() => {
    _discardDraft();
    decrementWeek();
  }, [decrementWeek, _discardDraft]);

  const toToday = useCallback(() => {
    scrollToNow();
    _discardDraft();
    goToToday();
  }, [scrollToNow, _discardDraft, goToToday]);

  const goToNextWeek = useCallback(() => {
    _discardDraft();
    incrementWeek();
  }, [incrementWeek, _discardDraft]);

  const openSidebar = useCallback(
    () => dispatch(viewSlice.actions.toggleSidebar()),
    [dispatch],
  );

  const createAllDayDraftEvent = useCallback(() => {
    createAlldayDraft(startOfView, endOfView, "createShortcut", dispatch);
  }, [dispatch, startOfView, endOfView]);

  const createTimedDraftEvent = useCallback(
    () =>
      createTimedDraft(isCurrentWeek, startOfView, "createShortcut", dispatch),
    [isCurrentWeek, startOfView, dispatch],
  );

  const createSomedayMonthDraft = useCallback(() => {
    _createSomedayDraft(Categories_Event.SOMEDAY_MONTH);
  }, [_createSomedayDraft]);

  const createSomedayWeekDraft = useCallback(() => {
    _createSomedayDraft(Categories_Event.SOMEDAY_WEEK);
  }, [_createSomedayDraft]);

  useKeyDownEvent({ combination: ["Shift", "1"], handler: openTasks });
  useKeyDownEvent({ combination: ["Shift", "2"], handler: openMonthWidget });
  useKeyDownEvent({ combination: ["Shift", "!"], handler: openTasks });
  useKeyDownEvent({ combination: ["Shift", "@"], handler: openMonthWidget });
  useKeyUpEvent({ combination: ["["], handler: openSidebar });
  useKeyUpEvent({ combination: ["j"], handler: goToPreviousWeek });
  useKeyUpEvent({ combination: ["k"], handler: goToNextWeek });
  useKeyUpEvent({ combination: ["t"], handler: toToday });
  useKeyUpEvent({ combination: ["a"], handler: createAllDayDraftEvent });
  useKeyUpEvent({ combination: ["c"], handler: createTimedDraftEvent });
  useKeyUpEvent({ combination: ["m"], handler: createSomedayMonthDraft });
  useKeyUpEvent({ combination: ["w"], handler: createSomedayWeekDraft });
};
