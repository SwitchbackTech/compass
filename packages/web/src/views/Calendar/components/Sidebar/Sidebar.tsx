import React, { useEffect } from "react";
import { ColorNames } from "@core/types/color.types";
import { FlexDirections } from "@web/components/Flex/styled";
import { getAlphaColor } from "@core/util/color.utils";
import { Divider } from "@web/components/Divider";
import { useDispatch } from "react-redux";
import { getSomedayEventsSlice } from "@web/ducks/events/event.slice";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Preferences } from "@web/views/Calendar/hooks/usePreferences";
import { SIDEBAR_MONTH_HEIGHT } from "@web/views/Calendar/layout.constants";
import { toUTCOffset } from "@web/common/utils/web.date.util";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

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
  prefs: Preferences;
  weekProps: WeekProps;
}

export const Sidebar: React.FC<Props & React.HTMLAttributes<HTMLDivElement>> = (
  props: Props
) => {
  const dispatch = useDispatch();

  const weekStart = props.weekProps.component.startOfSelectedWeekDay;
  const weekEnd = props.weekProps.component.endOfSelectedWeekDay;

  useEffect(() => {
    dispatch(
      getSomedayEventsSlice.actions.request({
        startDate: toUTCOffset(weekStart),
        endDate: toUTCOffset(weekEnd),
      })
    );
  }, [dispatch, weekStart, weekEnd]);

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
        <SomedaySection flex={1} weekRange={{ weekStart, weekEnd }} />
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
          setWeek={props.weekProps.state.setWeek}
          isCurrentWeek={props.weekProps.component.isCurrentWeek}
        />
      </StyledBottomSection>
    </Styled>
  );
};
