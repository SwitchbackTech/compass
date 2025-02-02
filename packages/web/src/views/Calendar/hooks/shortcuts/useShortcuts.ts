import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useHotkeys } from "react-hotkeys-hook";
import { Key } from "ts-keycode-enum";
import { Dayjs } from "dayjs";
import { Categories_Event } from "@core/types/event.types";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { isEventFormOpen } from "@web/common/utils";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";
import { assembleDefaultEvent } from "@web/common/utils/event.util";
import { YEAR_MONTH_FORMAT } from "@core/constants/date.constants";
import { selectSidebarTab } from "@web/ducks/events/selectors/view.selectors";

import { DateCalcs } from "../grid/useDateCalcs";
import { Util_Scroll } from "../grid/useScroll";
import { WeekProps } from "../useWeek";
import { getDraftTimes } from "../../components/Event/Draft/draft.util";

export interface ShortcutProps {
  today: Dayjs;
  dateCalcs: DateCalcs;
  isCurrentWeek: boolean;
  startOfView: Dayjs;
  endOfView: Dayjs;
  util: WeekProps["util"];
  scrollUtil: Util_Scroll;
}

export const useShortcuts = ({
  today,
  dateCalcs,
  isCurrentWeek,
  startOfView,
  endOfView,
  util,
  scrollUtil,
}: ShortcutProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const tab = useAppSelector(selectSidebarTab);

  useHotkeys("shift+1", () => {
    dispatch(viewSlice.actions.updateSidebarTab("tasks"));
  });
  useHotkeys("shift+2", () => {
    dispatch(viewSlice.actions.updateSidebarTab("monthWidget"));
  });

  useEffect(() => {
    const _createSomedayDraft = async (type: "week" | "month") => {
      if (type === "week" && isAtWeeklyLimit) {
        alert(SOMEDAY_WEEK_LIMIT_MSG);
        return;
      }
      if (type === "month" && isAtMonthlyLimit) {
        alert(SOMEDAY_MONTH_LIMIT_MSG);
        return;
      }

      if (tab !== "tasks") {
        dispatch(viewSlice.actions.updateSidebarTab("tasks"));
      }

      const eventType =
        type === "week"
          ? Categories_Event.SOMEDAY_WEEK
          : Categories_Event.SOMEDAY_MONTH;

      const somedayDefault = await assembleDefaultEvent(
        Categories_Event.SOMEDAY_WEEK
      );
      dispatch(
        draftSlice.actions.start({
          eventType,
          event: {
            ...somedayDefault,
            startDate: startOfView.format(YEAR_MONTH_FORMAT),
            endDate: endOfView.format(YEAR_MONTH_FORMAT),
          },
        })
      );
    };

    const _createTimedDraft = () => {
      const { startDate, endDate } = getDraftTimes(isCurrentWeek, startOfView);

      dispatch(
        draftSlice.actions.start({
          activity: "createShortcut",
          eventType: Categories_Event.TIMED,
          event: {
            startDate,
            endDate,
          },
        })
      );
    };

    const _discardDraft = () => {
      if (isEventFormOpen()) {
        dispatch(draftSlice.actions.discard());
      }
    };

    const keyDownHandler = (e: KeyboardEvent) => {
      if (isEventFormOpen()) return;

      const isCmdPaletteOpen =
        document.getElementById("headlessui-portal-root") !== null;
      if (isCmdPaletteOpen) return;

      if (e.metaKey) return;

      const handlersByKey = {
        [Key.OpenBracket]: () => dispatch(viewSlice.actions.toggleSidebar()),
        [Key.C]: () => _createTimedDraft(),
        [Key.T]: () => {
          scrollUtil.scrollToNow();
          _discardDraft();
          util.goToToday();
        },
        [Key.J]: () => {
          _discardDraft();
          util.decrementWeek();
        },
        [Key.K]: () => {
          _discardDraft();
          util.incrementWeek();
        },
        [Key.M]: () => _createSomedayDraft("month"),
        [Key.W]: () => _createSomedayDraft("week"),
        [Key.Z]: () => {
          navigate(ROOT_ROUTES.LOGOUT);
        },
      } as { [key: number]: () => void };

      const handler = handlersByKey[e.which];
      if (!handler) return;

      setTimeout(handler);
    };

    document.addEventListener("keydown", keyDownHandler);

    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, [
    dateCalcs,
    dispatch,
    today,
    isAtMonthlyLimit,
    isAtWeeklyLimit,
    isCurrentWeek,
    navigate,
    startOfView,
    endOfView,
    scrollUtil,
    util,
  ]);
};
