import { type Dayjs } from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { getWeekDayLabel } from "@web/common/utils/event/event.util";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { type FC } from "react";

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
      ? theme.color.text.lightInactive
      : isToday
        ? theme.color.text.accent
        : theme.color.text.light;

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
    <div className="mt-[10px] flex w-full">
      {weekDays.map((day) => {
        const dayNumber = getDayNumber(day);
        const { isToday, color } = getColor(day);

        return (
          <div
            className="flex min-w-[100px] basis-full items-end justify-center"
            key={getWeekDayLabel(day)}
            style={{ color }}
            title={getWeekDayLabel(day)}
          >
            <Text size="xxl" withGradient={isToday}>
              {dayNumber}
            </Text>
            <SpaceCharacter />
            <Text size="l">{day.format("ddd")}</Text>
          </div>
        );
      })}
    </div>
  );
};
