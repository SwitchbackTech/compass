import React, { FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { Text } from "@web/components/Text";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { SomedayEventsProps } from "@web/views/Calendar/hooks/draft/sidebar/useSidebar";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { ColorNames } from "@core/types/color.types";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

import { SomedayEvents } from "../SomedayEvents";
import { StyledSidebarTopHeader, StyledAddEventButton } from "../styled";

interface Props {
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  somedayProps: SomedayEventsProps;
  viewStart: WeekProps["component"]["startOfView"];
  weekLabel: string;
}

export const WeekSection: FC<Props> = ({
  dateCalcs,
  measurements,
  somedayProps,
  viewStart,
  weekLabel,
}) => {
  return (
    <>
      <StyledSidebarTopHeader
        alignItems={AlignItems.CENTER}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text colorName={ColorNames.WHITE_1} role="heading" size={22}>
          {weekLabel}
        </Text>

        <div onClick={(e) => e.stopPropagation()}>
          <TooltipWrapper
            description="Add to week"
            onClick={() =>
              somedayProps.util.onSectionClick(Categories_Event.SOMEDAY_WEEK)
            }
            shortcut="W"
          >
            <div role="button">
              <StyledAddEventButton size={25}>+</StyledAddEventButton>
            </div>
          </TooltipWrapper>
        </div>
      </StyledSidebarTopHeader>

      <SomedayEvents
        category={Categories_Event.SOMEDAY_WEEK}
        dateCalcs={dateCalcs}
        measurements={measurements}
        somedayProps={somedayProps}
        viewStart={viewStart}
      />
    </>
  );
};
