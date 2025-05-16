import React, { FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { getMonthListLabel } from "@web/common/utils/event.util";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import {
  Measurements_Grid,
  Refs_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { SomedayEvents } from "../SomedayEvents/SomedayEvents";
import { SidebarHeader, SidebarSection } from "../styled";

interface Props {
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfView"];
  gridRefs: Refs_Grid;
}

export const MonthSection: FC<Props> = ({
  dateCalcs,
  measurements,
  viewStart,
  gridRefs,
}) => {
  const monthLabel = getMonthListLabel(viewStart);

  const currentMonth = new Date().toLocaleString("default", { month: "long" });

  const isCurrentMonth = monthLabel === currentMonth;

  return (
    <SidebarSection>
      <SidebarHeader
        alignItems={AlignItems.CENTER}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text role="heading" size="xl">
          {isCurrentMonth ? "This Month" : monthLabel}
        </Text>
      </SidebarHeader>

      <SomedayEvents
        category={Categories_Event.SOMEDAY_MONTH}
        dateCalcs={dateCalcs}
        measurements={measurements}
        viewStart={viewStart}
        mainGridRef={gridRefs.mainGridRef}
      />
    </SidebarSection>
  );
};
