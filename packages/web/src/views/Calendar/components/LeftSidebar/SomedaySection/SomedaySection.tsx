import React, { FC, useMemo, useRef } from "react";
import { getAlphaColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { selectIsGetSomedayEventsProcessing } from "@web/ducks/events/selectors/someday.selectors";
import { Text } from "@web/components/Text";
import { getWeekRangeLabel } from "@web/common/utils/web.date.util";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { Divider } from "@web/components/Divider";
import { useAppSelector } from "@web/store/store.hooks";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useSidebar } from "@web/views/Calendar/hooks/draft/sidebar/useSidebar";

import { Styled, StyledAddEventButton, StyledSidebarTopHeader } from "./styled";
import { WeekSection } from "./WeekSection/WeekSection";
import { MonthSection } from "./MonthSection";

interface Props {
  dateCalcs: DateCalcs;
  flex?: number;
  measurements: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfView"];
  viewEnd: WeekProps["component"]["endOfView"];
}

export const SomedaySection: FC<Props> = ({
  dateCalcs,
  flex,
  measurements,
  viewEnd,
  viewStart,
}) => {
  const isProcessing = useAppSelector(selectIsGetSomedayEventsProcessing);

  const weekRange = { weekStart: viewStart, weekEnd: viewEnd };
  const sidebarProps = useSidebar(measurements, dateCalcs, weekRange);

  const somedayRef = useRef();
  const weekLabel = useMemo(
    () => getWeekRangeLabel(viewStart, viewEnd),
    [weekRange]
  );

  return (
    <Styled flex={flex} ref={somedayRef}>
      {isProcessing && <AbsoluteOverflowLoader />}

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
            onClick={() => sidebarProps.util.onSectionClick("week")}
            shortcut="W"
          >
            <div role="button">
              <StyledAddEventButton size={25}>+</StyledAddEventButton>
            </div>
          </TooltipWrapper>
        </div>
      </StyledSidebarTopHeader>

      <WeekSection
        dateCalcs={dateCalcs}
        measurements={measurements}
        somedayProps={sidebarProps}
        viewStart={viewStart}
      />

      <Divider
        color={getAlphaColor(ColorNames.WHITE_4, 0.3)}
        role="separator"
        title="sidebar divider"
        withAnimation={false}
      />

      <MonthSection
        dateCalcs={dateCalcs}
        measurements={measurements}
        somedayProps={sidebarProps}
        viewStart={viewStart}
      />
    </Styled>
  );
};
