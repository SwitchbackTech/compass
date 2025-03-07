import React, { FC } from "react";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { selectSidebarTab } from "@web/ducks/events/selectors/view.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import {
  Measurements_Grid,
  Refs_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { MonthTab } from "./MonthTab/MonthTab";
import { SidebarIconRow } from "./SidebarIconRow";
import { SomedayTab } from "./SomedayTab/SomedayTab";
import { SidebarContainer, SidebarTabContainer } from "./styled";

interface Props {
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
  gridRefs: Refs_Grid;
}

export const Sidebar: FC<Props & React.HTMLAttributes<HTMLDivElement>> = ({
  dateCalcs,
  measurements,
  weekProps,
  gridRefs,
}: Props) => {
  const weekStart = weekProps.component.startOfView;
  const weekEnd = weekProps.component.endOfView;

  const tab = useAppSelector(selectSidebarTab);

  return (
    <SidebarContainer id={ID_SIDEBAR} role="complementary">
      <SidebarTabContainer>
        {tab === "tasks" && (
          <SomedayTab
            dateCalcs={dateCalcs}
            measurements={measurements}
            viewStart={weekStart}
            viewEnd={weekEnd}
            gridRefs={gridRefs}
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
