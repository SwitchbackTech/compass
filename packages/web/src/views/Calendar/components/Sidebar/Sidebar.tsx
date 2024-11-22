import React, { FC } from "react";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { useAppSelector } from "@web/store/store.hooks";
import { selectSidebarTab } from "@web/ducks/events/selectors/view.selectors";

import { SidebarContainer, SidebarTabContainer } from "./styled";
import { SomedayTab } from "./SomedayTab/SomedayTab";
import { SidebarIconRow } from "./SidebarIconRow";
import { MonthTab } from "./MonthTab/MonthTab";
import { useSidebar } from "../../hooks/draft/sidebar/useSidebar";

interface Props {
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const Sidebar: FC<Props & React.HTMLAttributes<HTMLDivElement>> = ({
  dateCalcs,
  measurements,
  weekProps,
}: Props) => {
  const weekStart = weekProps.component.startOfView;
  const weekEnd = weekProps.component.endOfView;

  const tab = useAppSelector(selectSidebarTab);
  const sidebarProps = useSidebar(measurements, dateCalcs);

  return (
    <SidebarContainer
      id="sidebar"
      role="complementary"
      onClick={sidebarProps.util.discardIfDrafting}
    >
      <SidebarTabContainer>
        {tab === "tasks" && (
          <SomedayTab
            dateCalcs={dateCalcs}
            measurements={measurements}
            sidebarProps={sidebarProps}
            viewStart={weekStart}
            viewEnd={weekEnd}
          />
        )}
        {tab === "monthWidget" && (
          <MonthTab
            monthsShown={1}
            setStartOfView={weekProps.state.setStartOfView}
            isCurrentWeek={weekProps.component.isCurrentWeek}
            weekStart={weekProps.component.startOfView}
          />
        )}
      </SidebarTabContainer>
      <SidebarIconRow />
    </SidebarContainer>
  );
};
