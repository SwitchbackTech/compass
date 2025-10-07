import React, { FC } from "react";
import { Categories_Event } from "@core/types/event.types";
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
  weekLabel: string;
  gridRefs: Refs_Grid;
}

export const WeekSection: FC<Props> = ({
  dateCalcs,
  measurements,
  viewStart,
  weekLabel,
  gridRefs,
}) => {
  return (
    <SidebarSection>
      <SidebarHeader
        alignItems={AlignItems.CENTER}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text role="heading" size="xl">
          {weekLabel}
        </Text>
      </SidebarHeader>

      <SomedayEvents
        category={Categories_Event.SOMEDAY_WEEK}
        dateCalcs={dateCalcs}
        measurements={measurements}
        viewStart={viewStart}
        mainGridRef={gridRefs.mainGridRef}
      />
    </SidebarSection>
  );
};
