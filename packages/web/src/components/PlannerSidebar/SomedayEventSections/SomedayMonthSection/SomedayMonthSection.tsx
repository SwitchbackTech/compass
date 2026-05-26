import { type FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { COLUMN_MONTH } from "@web/common/constants/web.constants";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { SomedaySectionHeader } from "@web/components/PlannerSidebar/SomedayEventSections/SomedaySectionHeader/SomedaySectionHeader";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { SomedayEvents } from "../SomedayEvents/SomedayEvents";
import { useMonthLabel } from "./useMonthLabel";

interface Props {
  monthDate: WeekProps["component"]["startOfView"];
}

export const SomedayMonthSection: FC<Props> = ({ monthDate }) => {
  const monthLabel = useMonthLabel(monthDate);
  const { state } = useSidebarContext();
  const count = state.somedayEvents.columns[COLUMN_MONTH].eventIds.length;

  return (
    <div className="flex flex-col">
      <SomedaySectionHeader count={count} label={monthLabel} />

      <SomedayEvents category={Categories_Event.SOMEDAY_MONTH} />
    </div>
  );
};
