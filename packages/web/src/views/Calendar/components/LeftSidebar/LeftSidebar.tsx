import React, { FC } from "react";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Preferences } from "@web/views/Calendar/hooks/usePreferences";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

import { Styled, getSidebarToggleIcon, StyledSidebarOverflow } from "./styled";
import { SomedaySection } from "./SomedaySection";
import { SidebarIconRow } from "./SidebarIconRow";

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

      <SomedaySection
        dateCalcs={props.dateCalcs}
        flex={1}
        measurements={props.measurements}
        viewStart={weekStart}
        viewEnd={weekEnd}
      />

      <SidebarIconRow />
    </Styled>
  );
};
