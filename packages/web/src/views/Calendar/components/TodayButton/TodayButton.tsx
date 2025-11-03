import dayjs from "@core/util/date/dayjs";
import { CircleIcon } from "@web/components/Icons/CircleIcon";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

export const TodayButton = ({
  navigateToToday,
  isToday,
}: {
  navigateToToday: () => void;
  isToday: boolean;
}) => {
  return (
    <div aria-hidden={isToday} className={isToday ? "invisible" : "visible"}>
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
  );
};
