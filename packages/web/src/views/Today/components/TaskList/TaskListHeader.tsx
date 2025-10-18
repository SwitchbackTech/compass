import React from "react";
import dayjs from "@core/util/date/dayjs";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { useTasks } from "../../context/TaskProvider";
import { useDateInView } from "../../hooks/useDateInView";
import { ChevronLeftIcon } from "../Icons/ChevronLeftIcon";
import { ChevronRightIcon } from "../Icons/ChevronRightIcon";
import { CircleIcon } from "../Icons/CircleIcon";

export const HEADING_FORMAT = "dddd";
export const SUBHEADING_FORMAT = "MMMM D";

export const TaskListHeader = () => {
  const { navigateToPreviousDay, navigateToNextDay, navigateToToday } =
    useTasks();

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
      <div className="flex items-center">
        <h3 className="text-white-100 text-sm font-medium" aria-live="polite">
          {subheader}
        </h3>
      </div>
      <div className="flex items-center gap-0">
        <TooltipWrapper
          description="Previous day"
          onClick={navigateToPreviousDay}
          shortcut="J"
        >
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
            aria-label="Previous day"
          >
            <ChevronLeftIcon />
          </button>
        </TooltipWrapper>
        <div className={isToday ? "invisible" : "visible"}>
          <TooltipWrapper
            description={dayjs().locale("en").format(HEADING_FORMAT)}
            onClick={navigateToToday}
            shortcut="T"
          >
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              aria-label="Go to today"
            >
              <CircleIcon />
            </button>
          </TooltipWrapper>
        </div>
        <TooltipWrapper
          description="Next day"
          onClick={navigateToNextDay}
          shortcut="K"
        >
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
            aria-label="Next day"
          >
            <ChevronRightIcon />
          </button>
        </TooltipWrapper>
      </div>
    </div>
  );
};
