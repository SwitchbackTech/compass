import { type FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { COLUMN_WEEK } from "@web/common/constants/web.constants";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { SomedaySectionHeader } from "@web/components/PlannerSidebar/SomedayEventSections/SomedaySectionHeader/SomedaySectionHeader";
import { SomedayEvents } from "../SomedayEvents/SomedayEvents";

interface Props {
  weekLabel: string;
}

export const SomedayWeekSection: FC<Props> = ({ weekLabel }) => {
  const { state } = useSidebarContext();
  const count = state.somedayEvents.columns[COLUMN_WEEK].eventIds.length;

  return (
    <div className="flex flex-col">
      <SomedaySectionHeader count={count} label={weekLabel} />

      <SomedayEvents category={Categories_Event.SOMEDAY_WEEK} />
    </div>
  );
};
