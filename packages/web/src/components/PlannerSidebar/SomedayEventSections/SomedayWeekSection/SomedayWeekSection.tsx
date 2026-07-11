import { type FC } from "react";
import { type Event } from "@core/types/event.contracts";
import { Categories_Event } from "@core/types/event.types";
import { SomedaySectionHeader } from "@web/components/PlannerSidebar/SomedayEventSections/SomedaySectionHeader/SomedaySectionHeader";
import { SomedayEvents } from "../SomedayEvents/SomedayEvents";

interface Props {
  events: Event[];
  weekLabel: string;
}

export const SomedayWeekSection: FC<Props> = ({ events, weekLabel }) => {
  return (
    <div className="flex flex-col">
      <SomedaySectionHeader count={events.length} label={weekLabel} />

      <SomedayEvents category={Categories_Event.SOMEDAY_WEEK} events={events} />
    </div>
  );
};
