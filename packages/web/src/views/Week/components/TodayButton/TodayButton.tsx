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
  if (isToday) return null;

  return (
    <div>
      <TooltipWrapper
        description={dayjs().locale("en").format("dddd, MMMM D")}
        onClick={navigateToToday}
        shortcut="T"
      >
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full text-text transition-colors hover:bg-text/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Go to today"
        >
          <CircleIcon />
        </button>
      </TooltipWrapper>
    </div>
  );
};
