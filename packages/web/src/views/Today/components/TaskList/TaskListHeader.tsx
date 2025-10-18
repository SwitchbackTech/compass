import React from "react";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { useTasks } from "../../context/TaskProvider";
import { useDateInView } from "../../hooks/useDateInView";

export const HEADING_FORMAT = "dddd, MMMM D";

export const TaskListHeader = () => {
  const { navigateToPreviousDay, navigateToNextDay } = useTasks();

  const dateInView = useDateInView();
  const todayHeading = dateInView.locale("en").format(HEADING_FORMAT);

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
