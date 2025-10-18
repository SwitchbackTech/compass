import React from "react";
import dayjs from "@core/util/date/dayjs";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { useTasks } from "../../context/TaskProvider";
import { useDateInView } from "../../hooks/useDateInView";

export const HEADING_FORMAT = "dddd, MMMM D";

export const TaskListHeader = () => {
  const { navigateToPreviousDay, navigateToNextDay, navigateToToday } =
    useTasks();

  const dateInView = useDateInView();
  const todayHeading = dateInView.locale("en").format(HEADING_FORMAT);
  const isToday = dateInView.startOf("day").isSame(dayjs().startOf("day"));

  return (
    <div className="border-b border-gray-400/20 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white-100 text-xl font-semibold" aria-live="polite">
          {todayHeading}
        </h2>
        <div className="flex items-center">
          <TooltipWrapper
            description="Previous day"
            onClick={navigateToPreviousDay}
            shortcut="J"
          >
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              aria-label="Previous day"
            >
              {"<"}
            </button>
          </TooltipWrapper>
          {!isToday && (
            <TooltipWrapper
              description={dayjs().locale("en").format(HEADING_FORMAT)}
              onClick={navigateToToday}
              shortcut="T"
            >
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
                aria-label="Go to today"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="6" cy="6" r="3" fill="currentColor" />
                </svg>
              </button>
            </TooltipWrapper>
          )}
          <TooltipWrapper
            description="Next day"
            onClick={navigateToNextDay}
            shortcut="K"
          >
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              aria-label="Next day"
            >
              {">"}
            </button>
          </TooltipWrapper>
        </div>
      </div>
    </div>
  );
};
