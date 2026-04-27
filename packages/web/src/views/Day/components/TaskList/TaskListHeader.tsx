import dayjs from "@core/util/date/dayjs";
import { ArrowButton } from "@web/components/Button/ArrowButton";
import { SelectView } from "@web/components/SelectView/SelectView";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { TodayButton } from "@web/views/Calendar/components/TodayButton/TodayButton";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { useDateNavigation } from "@web/views/Day/hooks/navigation/useDateNavigation";

export const DAY_HEADING_FORMAT = "dddd";
export const DAY_SUBHEADING_FORMAT = "MMMM D";

export const TaskListHeader = () => {
  const dateNav = useDateNavigation();
  const dateInView = useDateInView();

  const { navigateToPreviousDay, navigateToNextDay, navigateToToday } = dateNav;
  const header = dateInView.locale("en").format(DAY_HEADING_FORMAT);
  const subheader = dateInView.locale("en").format(DAY_SUBHEADING_FORMAT);
  const isToday = dateInView.isSame(dayjs(), "day");

  return (
    <div className="border-b border-gray-400/20 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 aria-live="polite">
            <SelectView
              displayLabel={header}
              buttonClassName="flex items-center gap-2 rounded px-0 py-0 text-xl font-semibold text-white-100 transition-colors hover:bg-white/10"
            />
          </h2>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-white-100 text-sm font-medium" aria-live="polite">
          {subheader}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <TodayButton navigateToToday={navigateToToday} isToday={isToday} />
            <TooltipWrapper onClick={navigateToPreviousDay} shortcut="J">
              <ArrowButton
                direction="left"
                label="Previous day"
                onClick={navigateToPreviousDay}
              />
            </TooltipWrapper>
            <TooltipWrapper onClick={navigateToNextDay} shortcut="K">
              <ArrowButton
                direction="right"
                label="Next day"
                onClick={navigateToNextDay}
              />
            </TooltipWrapper>
          </div>
        </div>
      </div>
    </div>
  );
};
