import { type FC } from "react";
import { type Event } from "@core/types/event.contracts";
import { Categories_Event } from "@core/types/event.types";
import { SomedaySectionHeader } from "@web/components/PlannerSidebar/SomedayEventSections/SomedaySectionHeader/SomedaySectionHeader";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { SomedayEvents } from "../SomedayEvents/SomedayEvents";
import { useMonthLabel } from "./useMonthLabel";

interface Props {
  events: Event[];
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
