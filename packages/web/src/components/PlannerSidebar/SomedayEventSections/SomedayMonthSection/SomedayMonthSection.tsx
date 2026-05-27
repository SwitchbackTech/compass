import { type FC } from "react";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { SomedaySectionHeader } from "@web/components/PlannerSidebar/SomedayEventSections/SomedaySectionHeader/SomedaySectionHeader";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { SomedayEvents } from "../SomedayEvents/SomedayEvents";
import { useMonthLabel } from "./useMonthLabel";

interface Props {
  events: Schema_Event[];
  monthDate: WeekProps["component"]["startOfView"];
}

export const SomedayMonthSection: FC<Props> = ({ events, monthDate }) => {
  const monthLabel = useMonthLabel(monthDate);

  return (
    <div className="flex flex-col">
      <SomedaySectionHeader count={events.length} label={monthLabel} />

      <SomedayEvents
        category={Categories_Event.SOMEDAY_MONTH}
        events={events}
      />
    </div>
  );
};
