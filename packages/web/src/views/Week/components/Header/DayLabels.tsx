import cn from "classnames";
import { type FC } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { CALENDAR_EVENT_WIDTH_MINIMUM } from "@web/common/calendar-grid/calendarGrid.constants";
import { getWeekDayLabel } from "@web/common/utils/event/event.util";

interface Props {
  today: Dayjs;
  startOfView: Dayjs;
  week: number;
  weekDays: Dayjs[];
}

export const DayLabels: FC<Props> = ({
  startOfView,
  today,
  week,
  weekDays,
}) => {
  const getColor = (day: Dayjs) => {
    const isCurrentWeek = today.week() === week;
    const isToday = isCurrentWeek && today.format("DD") === day.format("DD");
    const color = day.isBefore(today, "day")
      ? "var(--compass-color-text-light-inactive)"
      : isToday
        ? "var(--compass-color-accent-primary)"
        : "var(--compass-color-text-light)";

    return { isToday, color };
  };

  const getDayNumber = (day: Dayjs) => {
    let dayNumber = day.format("D");

    dayNumber =
      day.format("MM") !== startOfView.format("MM") && day.format("D") === "1"
        ? day.format("MMM D")
        : dayNumber;

    return dayNumber;
  };

  return (
    <div className="relative mt-2.5 min-h-8 w-full">
      <div
        className="absolute top-0 left-12.5 grid h-full w-[calc(100%-50px)] items-end"
        style={{
          gridTemplateColumns: `repeat(${weekDays.length}, minmax(${CALENDAR_EVENT_WIDTH_MINIMUM}px, 1fr))`,
        }}
      >
        {weekDays.map((day) => {
          const dayNumber = getDayNumber(day);
          const { isToday, color } = getColor(day);

          return (
            <div
              className="flex items-end justify-center gap-1"
              key={getWeekDayLabel(day)}
              style={{ color }}
              title={getWeekDayLabel(day)}
            >
              <span
                className={cn(
                  "relative text-[clamp(var(--font-size-xl),2.7cqw,var(--font-size-xxl))] leading-none",
                  isToday && "c-text-gradient",
                )}
              >
                {dayNumber}
              </span>
              <span className="relative text-[clamp(var(--font-size-m),2cqw,var(--font-size-l))] leading-none">
                {day.format("ddd")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
