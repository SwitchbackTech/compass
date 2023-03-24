import React from "react";
import { ColorNames } from "@core/types/color.types";
import { FlexDirections } from "@web/components/Flex/styled";
import { getAlphaColor } from "@core/util/color.utils";
import { Divider } from "@web/components/Divider";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Preferences } from "@web/views/Calendar/hooks/usePreferences";
import { SIDEBAR_MONTH_HEIGHT } from "@web/views/Calendar/layout.constants";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

import {
  Styled,
  StyledTopSectionFlex,
  StyledBottomSection,
  getSidebarToggleIcon,
  StyledSidebarOverflow,
} from "./styled";
import { SomedaySection } from "./SomedaySection";
import { ToggleableMonthWidget } from "./ToggleableMonthWidget";

interface Props {
  dateCalcs: DateCalcs;
  prefs: Preferences;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const Sidebar: React.FC<Props & React.HTMLAttributes<HTMLDivElement>> = (
  props: Props
) => {
  const weekStart = props.weekProps.component.startOfView;
  const weekEnd = props.weekProps.component.endOfView;

  const SidebarToggleIcon = getSidebarToggleIcon(props.prefs.isSidebarOpen);

  return (
    <Styled
      id="sidebar"
      isToggled={props.prefs.isSidebarOpen}
      role="complementary"
    >
      <StyledSidebarOverflow isToggled={props.prefs.isSidebarOpen} />

      <TooltipWrapper
        description={`${
          props.prefs.isSidebarOpen ? "Collapse" : "Open"
        } sidebar`}
        onClick={props.prefs.toggleSidebar}
        shortcut="["
      >
        <div role="button">
          <SidebarToggleIcon cursor="pointer" />
        </div>
      </TooltipWrapper>

      <StyledTopSectionFlex
        direction={FlexDirections.COLUMN}
        height={`calc(100% - ${SIDEBAR_MONTH_HEIGHT + 2}px)`}
      >
        <SomedaySection
          dateCalcs={props.dateCalcs}
          flex={1}
          measurements={props.measurements}
          viewStart={weekStart}
          viewEnd={weekEnd}
        />
      </StyledTopSectionFlex>
      <Divider
        color={getAlphaColor(ColorNames.WHITE_4, 0.5)}
        role="separator"
        title="sidebar divider"
        withAnimation={false}
      />
      <StyledBottomSection height={String(SIDEBAR_MONTH_HEIGHT)}>
        <ToggleableMonthWidget
          isToggled={true}
          monthsShown={1}
          setStartOfView={props.weekProps.state.setStartOfView}
          isCurrentWeek={props.weekProps.component.isCurrentWeek}
          weekStart={weekStart}
        />
      </StyledBottomSection>
    </Styled>
  );
};
