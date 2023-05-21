import React, { FC } from "react";
import { ColorNames } from "@core/types/color.types";
import { FlexDirections } from "@web/components/Flex/styled";
import { getAlphaColor } from "@core/util/color.utils";
import { Divider } from "@web/components/Divider";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Preferences } from "@web/views/Calendar/hooks/usePreferences";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

import {
  Styled,
  StyledSomedaySection,
  StyledBottomRow,
  getSidebarToggleIcon,
  StyledSidebarOverflow,
  StyledBottomSectionFlex,
} from "./styled";
import { SomedaySection } from "./SomedaySection";
import { SidebarIconRow } from "./SidebarIconRow/SidebarIconRow";
import { ToggleableMonthWidget } from "./ToggleableMonthWidget";

interface Props {
  dateCalcs: DateCalcs;
  prefs: Preferences;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const LeftSidebar: FC<Props & React.HTMLAttributes<HTMLDivElement>> = (
  props: Props
) => {
  const { prefs } = props;
  const weekStart = props.weekProps.component.startOfView;
  const weekEnd = props.weekProps.component.endOfView;

  const SidebarToggleIcon = getSidebarToggleIcon(props.prefs.isLeftSidebarOpen);

  return (
    <Styled
      id="sidebar"
      isToggled={prefs.isLeftSidebarOpen}
      role="complementary"
    >
      <StyledSidebarOverflow isToggled={prefs.isLeftSidebarOpen} />
      <TooltipWrapper
        description={`${prefs.isLeftSidebarOpen ? "Collapse" : "Open"} sidebar`}
        onClick={() => prefs.toggleSidebar("left")}
        shortcut="["
      >
        <div role="button">
          <SidebarToggleIcon cursor="pointer" />
        </div>
      </TooltipWrapper>

      <StyledSomedaySection
        direction={FlexDirections.COLUMN}
        // height={`calc(100% - ${SIDEBAR_MONTH_HEIGHT + 2}px)`}
      >
        <SomedaySection
          dateCalcs={props.dateCalcs}
          flex={1}
          measurements={props.measurements}
          viewStart={weekStart}
          viewEnd={weekEnd}
        />
      </StyledSomedaySection>
      {props.prefs.isMonthWidgetOpen && (
        <ToggleableMonthWidget
          monthsShown={1}
          setStartOfView={props.weekProps.state.setStartOfView}
          isCurrentWeek={props.weekProps.component.isCurrentWeek}
          weekStart={props.weekProps.component.startOfView}
        />
      )}
      <SidebarIconRow prefs={prefs} />
    </Styled>
  );
};
