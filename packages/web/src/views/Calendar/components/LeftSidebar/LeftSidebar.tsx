import React, { FC } from "react";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { Divider } from "@web/components/Divider/Divider";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { selectSidebar } from "@web/ducks/events/selectors/view.selectors";
import { viewSlice } from "@web/ducks/events/slices/view.slice";

import {
  StyledLeftSidebar,
  getSidebarToggleIcon,
  StyledCollapsedSidebar,
} from "./styled";
import { SomedaySection } from "./SomedaySection";
import { SidebarIconRow } from "./SidebarIconRow";
import { ToggleableMonthWidget } from "./ToggleableMonthWidget/ToggleableMonthWidget";

interface Props {
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const LeftSidebar: FC<Props & React.HTMLAttributes<HTMLDivElement>> = (
  props: Props
) => {
  const weekStart = props.weekProps.component.startOfView;
  const weekEnd = props.weekProps.component.endOfView;

  const dispatch = useAppDispatch();
  const { isOpen, tab } = useAppSelector(selectSidebar);
  const ToggleSidebarIcon = getSidebarToggleIcon(isOpen);

  return (
    <StyledLeftSidebar id="sidebar" isToggled={isOpen} role="complementary">
      <TooltipWrapper
        description={`${isOpen ? "Collapse" : "Open"} sidebar`}
        onClick={() => dispatch(viewSlice.actions.toggleSidebar())}
        shortcut="["
      >
        <ToggleSidebarIcon size={25} />
      </TooltipWrapper>

      <StyledCollapsedSidebar isToggled={isOpen} />

      {tab === "tasks" && (
        <SomedaySection
          dateCalcs={props.dateCalcs}
          flex={1}
          measurements={props.measurements}
          viewStart={weekStart}
          viewEnd={weekEnd}
        />
      )}
      {tab === "monthWidget" && (
        <>
          <ToggleableMonthWidget
            monthsShown={1}
            setStartOfView={props.weekProps.state.setStartOfView}
            isCurrentWeek={props.weekProps.component.isCurrentWeek}
            weekStart={props.weekProps.component.startOfView}
          />
          <div>
            <Divider
              role="separator"
              title="right sidebar divider"
              withAnimation={false}
            />
            <p>Calendars</p>
            <label>
              <input checked={true} disabled={true} type="checkbox" />
              primary
            </label>
          </div>
        </>
      )}
      <SidebarIconRow />
    </StyledLeftSidebar>
  );
};
