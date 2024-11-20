import React, { FC } from "react";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { Divider } from "@web/components/Divider/Divider";
import { useAppSelector } from "@web/store/store.hooks";
import { selectSidebarTab } from "@web/ducks/events/selectors/view.selectors";
import { Text } from "@web/components/Text";
import { theme } from "@web/common/styles/theme";

import {
  SidebarContainer,
  CalendarLabel,
  CalendarListContainer,
  SidebarTabContainer,
} from "./styled";
import { SomedaySection } from "./SomedayTab";
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
          <SomedaySection
            dateCalcs={dateCalcs}
            measurements={measurements}
            sidebarProps={sidebarProps}
            viewStart={weekStart}
            viewEnd={weekEnd}
          />
        )}
        {tab === "monthWidget" && (
          <>
            <MonthTab
              monthsShown={1}
              setStartOfView={weekProps.state.setStartOfView}
              isCurrentWeek={weekProps.component.isCurrentWeek}
              weekStart={weekProps.component.startOfView}
            />
            <Divider
              role="separator"
              title="right sidebar divider"
              withAnimation={false}
            />
            <CalendarListContainer>
              <Text color={theme.color.text.light} size="xl">
                Calendars
              </Text>
              <CalendarLabel>
                <input
                  checked={true}
                  disabled={true}
                  type="checkbox"
                  style={{ marginRight: "6px" }}
                />
                <Text color={theme.color.text.light} size="m">
                  primary
                </Text>
              </CalendarLabel>
            </CalendarListContainer>
          </>
        )}
      </SidebarTabContainer>
      <SidebarIconRow />
    </SidebarContainer>
  );
};
