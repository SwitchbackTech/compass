import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Key } from "ts-keycode-enum";
import { Dayjs } from "dayjs";
import { Categories_Event } from "@core/types/event.types";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { isDrafting } from "@web/common/utils";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";

import { DateCalcs } from "../grid/useDateCalcs";
import { Util_Scroll } from "../grid/useScroll";
import { WeekProps } from "../useWeek";
import { getDraftTimes } from "../../components/Event/Draft/draft.util";

export interface ShortcutProps {
  today: Dayjs;
  dateCalcs: DateCalcs;
  isCurrentWeek: boolean;
  startOfSelectedWeek: Dayjs;
  util: WeekProps["util"];
  scrollUtil: Util_Scroll;
  toggleSidebar: (target: "left" | "right") => void;
}

export const useShortcuts = ({
  today,
  dateCalcs,
  isCurrentWeek,
  startOfSelectedWeek,
  util,
  scrollUtil,
  toggleSidebar,
}: ShortcutProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);

  useEffect(() => {
    const _createSomedayDraft = (type: "week" | "month") => {
      if (type === "week" && isAtWeeklyLimit) {
        alert(SOMEDAY_WEEK_LIMIT_MSG);
        return;
      }
      if (type === "month" && isAtMonthlyLimit) {
        alert(SOMEDAY_MONTH_LIMIT_MSG);
        return;
      }

      const eventType =
        type === "week"
          ? Categories_Event.SOMEDAY_WEEK
          : Categories_Event.SOMEDAY_MONTH;

      dispatch(
        draftSlice.actions.start({
          eventType,
        })
      );
    };

    const _createTimedDraft = () => {
      const { startDate, endDate } = getDraftTimes(
        isCurrentWeek,
        startOfSelectedWeek
      );

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
      if (isDrafting()) {
        dispatch(draftSlice.actions.discard());
      }
    };

    const keyDownHandler = (e: KeyboardEvent) => {
      if (isDrafting()) return;

      const isCmdPaletteOpen =
        document.getElementById("headlessui-portal-root") !== null;
      if (isCmdPaletteOpen) return;

      if (e.metaKey) return;

      const handlersByKey = {
        [Key.OpenBracket]: () => toggleSidebar("left"),
        [Key.ClosedBracket]: () =>
          dispatch(settingsSlice.actions.toggleRightSidebar()),
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
    startOfSelectedWeek,
    scrollUtil,
    toggleSidebar,
    util,
  ]);
};
