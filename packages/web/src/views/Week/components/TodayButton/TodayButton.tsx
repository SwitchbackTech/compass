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
          className="flex h-6 w-6 items-center justify-center rounded-full text-text-lighter transition-colors hover:bg-text-lighter/20 focus:bg-text-lighter/20 focus:outline-none focus:ring-2 focus:ring-text-lighter/50"
          aria-label="Go to today"
        >
          <CircleIcon />
        </button>
      </TooltipWrapper>
    </div>
  );
};
