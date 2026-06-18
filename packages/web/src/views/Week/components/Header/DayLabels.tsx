import { type FC } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { getWeekDayLabel } from "@web/common/utils/event/event.util";
import { Text } from "@web/components/Text/Text";

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
    <div className="c-week-day-labels">
      <div className="c-week-columns h-full items-end">
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
              <Text className="week-day-number" withGradient={isToday}>
                {dayNumber}
              </Text>
              <Text className="week-day-name">{day.format("ddd")}</Text>
            </div>
          );
        })}
      </div>
    </div>
  );
};
