import React from "react";
import dayjs from "@core/util/date/dayjs";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { useDateInView } from "../../hooks/useDateInView";
import { useDateNavigation } from "../../hooks/useDateNavigation";
import { ChevronLeftIcon } from "../Icons/ChevronLeftIcon";
import { ChevronRightIcon } from "../Icons/ChevronRightIcon";
import { CircleIcon } from "../Icons/CircleIcon";

export const HEADING_FORMAT = "dddd";
export const SUBHEADING_FORMAT = "MMMM D";

export const TaskListHeader = () => {
  const { navigateToPreviousDay, navigateToNextDay, navigateToToday } =
    useDateNavigation();

  const dateInView = useDateInView();
  const header = dateInView.locale("en").format(HEADING_FORMAT);
  const subheader = dateInView.locale("en").format(SUBHEADING_FORMAT);
  const isToday = dateInView.startOf("day").isSame(dayjs().startOf("day"));

  return (
    <div className="border-b border-gray-400/20 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white-100 text-xl font-semibold" aria-live="polite">
          {header}
        </h2>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-white-100 text-sm font-medium" aria-live="polite">
          {subheader}
        </h3>
        <div className="flex items-center gap-1">
          <div
            aria-hidden={isToday}
            className={isToday ? "invisible" : "visible"}
          >
            <TooltipWrapper
              description={dayjs().locale("en").format("dddd, MMMM D")}
              onClick={navigateToToday}
              shortcut="T"
            >
              <button
                className="flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 focus:bg-white/20 focus:ring-2 focus:ring-white/50 focus:outline-none"
                aria-label="Go to today"
              >
                <CircleIcon />
              </button>
            </TooltipWrapper>
          </div>
          <TooltipWrapper onClick={navigateToPreviousDay} shortcut="J">
            <button
              className="flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 focus:bg-white/20 focus:ring-2 focus:ring-white/50 focus:outline-none"
              aria-label="Previous day"
            >
              <ChevronLeftIcon />
            </button>
          </TooltipWrapper>
          <TooltipWrapper onClick={navigateToNextDay} shortcut="K">
            <button
              className="flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 focus:bg-white/20 focus:ring-2 focus:ring-white/50 focus:outline-none"
              aria-label="Next day"
            >
              <ChevronRightIcon />
            </button>
          </TooltipWrapper>
        </div>
      </div>
    </div>
  );
};
