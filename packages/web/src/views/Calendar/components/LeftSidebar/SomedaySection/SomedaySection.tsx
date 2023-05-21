import React, { FC, useRef } from "react";
import { ColorNames } from "@core/types/color.types";
import { selectIsGetSomedayEventsProcessing } from "@web/ducks/events/selectors/someday.selectors";
import { Text } from "@web/components/Text";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { useAppSelector } from "@web/store/store.hooks";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useSomedayEvents } from "@web/views/Calendar/hooks/draft/useSidebarDraft";

import { Styled, StyledAddEventButton, StyledHeader } from "./styled";
import { WeekSection } from "./WeekSection/WeekSection";
import { MonthSection } from "./MonthSection";
import { Divider } from "@web/components/Divider";
import { getAlphaColor } from "@core/util/color.utils";

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

  const somedayProps = useSomedayEvents(measurements, dateCalcs, {
    weekStart: viewStart,
    weekEnd: viewEnd,
  });
  const { state, util } = somedayProps;

  const somedayRef = useRef();

  return (
    <Styled flex={flex} onClick={util.onSectionClick} ref={somedayRef}>
      {isProcessing && <AbsoluteOverflowLoader />}

      <StyledHeader
        alignItems={AlignItems.CENTER}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text colorName={ColorNames.WHITE_1} role="heading" size={22}>
          {state.weekLabel}
        </Text>

        <div onClick={(e) => e.stopPropagation()}>
          <TooltipWrapper
            description="Add to week"
            onClick={util.onSectionClick}
            shortcut="S"
          >
            <div role="button">
              <StyledAddEventButton size={25}>+</StyledAddEventButton>
            </div>
          </TooltipWrapper>
        </div>
      </StyledHeader>

      <WeekSection
        dateCalcs={dateCalcs}
        measurements={measurements}
        somedayProps={somedayProps}
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
        somedayProps={somedayProps}
        viewStart={viewStart}
      />
    </Styled>
  );
};
