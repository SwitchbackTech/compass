import { type FC } from "react";
import { useWeekLabel } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayWeekSection/useWeekLabel";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { SomedayMonthSection } from "./SomedayMonthSection/SomedayMonthSection";
import { SomedayWeekSection } from "./SomedayWeekSection/SomedayWeekSection";

interface Props {
  calendarDate: WeekProps["component"]["startOfView"];
  viewStart: WeekProps["component"]["startOfView"];
  viewEnd: WeekProps["component"]["endOfView"];
}

export const SomedayEventSections: FC<Props> = ({
  calendarDate,
  viewEnd,
  viewStart,
}) => {
  const weekLabel = useWeekLabel(viewStart, viewEnd);

  return (
    <div className="flex flex-col gap-6">
      <SomedayWeekSection weekLabel={weekLabel} />

      <SomedayMonthSection monthDate={calendarDate} />
    </div>
  );
};
