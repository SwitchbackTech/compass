import { type FC } from "react";
import { type Event } from "@core/types/event.contracts";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { type State_Sidebar } from "@web/components/PlannerSidebar/draft/hooks/useSidebarState";
import { useWeekLabel } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayWeekSection/useWeekLabel";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { SomedayMonthSection } from "./SomedayMonthSection/SomedayMonthSection";
import { SomedayWeekSection } from "./SomedayWeekSection/SomedayWeekSection";

interface Props {
  calendarDate: WeekProps["component"]["startOfView"];
  viewStart: WeekProps["component"]["startOfView"];
  viewEnd: WeekProps["component"]["endOfView"];
}

const getSectionEvents = (
  columnName: typeof COLUMN_WEEK | typeof COLUMN_MONTH,
  somedayEvents: State_Sidebar["somedayEvents"],
): Event[] =>
  somedayEvents.columns[columnName].eventIds.flatMap((eventId) =>
    somedayEvents.events[eventId] ? [somedayEvents.events[eventId]] : [],
  );

export const SomedayEventSections: FC<Props> = ({
  calendarDate,
  viewEnd,
  viewStart,
}) => {
  const { state } = useSidebarContext();
  const weekLabel = useWeekLabel(viewStart, viewEnd);
  const weekEvents = getSectionEvents(COLUMN_WEEK, state.somedayEvents);
  const monthEvents = getSectionEvents(COLUMN_MONTH, state.somedayEvents);

  return (
    <div className="flex flex-col gap-6">
      <SomedayWeekSection events={weekEvents} weekLabel={weekLabel} />

      <SomedayMonthSection events={monthEvents} monthDate={calendarDate} />
    </div>
  );
};
