import React, { useEffect, useState } from "react";
import { Priorities, Priority } from "@core/constants/core.constants";
import { ColorNames } from "@core/constants/colors";
import { Text } from "@web/components/Text";
import {
  AlignItems,
  FlexDirections,
  JustifyContent,
} from "@web/components/Flex/styled";
import { getAlphaColor, getColor } from "@core/util/color.utils";
import { colorNameByPriority } from "@core/constants/colors";
import { Divider } from "@web/components/Divider";
import { useDispatch } from "react-redux";
import { getFutureEventsSlice } from "@web/ducks/events/event.slice";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Preferences } from "@web/views/Calendar/hooks/usePreferences";

import {
  Styled,
  StyledTopSectionFlex,
  StyledCheckBox,
  StyledPriorityFilterItem,
  StyledBottomSection,
  renderStyledSidebarToggleIcon,
  StyledHeaderFlex,
  StyledSidebarOverflow,
} from "./styled";
import { ToggleableMonthWidget } from "./ToggleableMonthWidget";
import { SomedaySection } from "./SomedaySection";

/* imports from the old someday section*/
// import {
// OldStyledSomedaySection,
// StyledFiltersPopoverContent
// StyledPriorityFilterButton
// StyledDividerWrapper
// } from "./styled"
// import { Popover } from "react-tiny-popover";
// import dayjs from "dayjs";
// import { YEAR_MONTH_FORMAT } from "@web/common/constants/dates";
// import { SomedayEventsFutureContainer } from "@web/views/Calendar/containers/SomedayContainer/SomedayCategories";

const DATEPICKER_HEIGHT = 346;

export interface PriorityFilter {
  [Priorities.RELATIONS]?: boolean;
  [Priorities.WORK]?: boolean;
  [Priorities.SELF]?: boolean;
}

const priorityNameByKey = {
  [Priorities.WORK]: "Work",
  [Priorities.RELATIONS]: "Relationships",
  [Priorities.SELF]: "Self",
};

interface Props {
  prefs: Preferences;
  weekProps: WeekProps;
}

export const Sidebar: React.FC<Props & React.HTMLAttributes<HTMLDivElement>> = (
  props
) => {
  const [bottomSectionHeight, setBottomSectionHeight] =
    useState(DATEPICKER_HEIGHT);

  const [isDividerDragging, setIsDividerDragging] = useState(false);
  const [isCurrentMonthToggled, setIsCurrentMonthToggled] = useState(true);
  const [isFutureToggled, setIsFutureToggled] = useState(true);
  const [isCalendarsToggled, setIsCalendarsToggled] = useState(true);

  const monthsShown = Math.floor(+(bottomSectionHeight / DATEPICKER_HEIGHT));
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getFutureEventsSlice.actions.request());
  }, [dispatch]);

  useEffect(() => {
    if (bottomSectionHeight > window.innerHeight / 2) {
      if (!isFutureToggled) return;
      setIsFutureToggled(false);
    }

    if (bottomSectionHeight > window.innerHeight - 150) {
      if (!isCurrentMonthToggled) return;
      setIsCurrentMonthToggled(false);
    }
  }, [bottomSectionHeight]);

  useEffect(() => {
    const height = isCalendarsToggled ? DATEPICKER_HEIGHT : 85;
    if (bottomSectionHeight === height) return;

    setBottomSectionHeight(height);
  }, [isCalendarsToggled]);

  const getEventsSectionFlex = (sectionType: "currentMonth" | "future") => {
    const dividerIndexBySectionType = {
      currentMonth: isCurrentMonthToggled && 1,
      future: isFutureToggled && 1,
    };

    return dividerIndexBySectionType[sectionType] || undefined;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDividerDragging) return;

    // 5 - top padding of divider container
    setBottomSectionHeight(window.innerHeight - e.clientY + 5);
  };

  const onMouseUp = () => {
    setIsDividerDragging(false);
  };

  const StyledSidebarToggleIcon = renderStyledSidebarToggleIcon(
    props.prefs.isSidebarOpen
  );

  return (
    <Styled
      // {...props} //$$
      id="sidebar"
      isToggled={props.prefs.isSidebarOpen}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      role="complementary"
    >
      <StyledSidebarOverflow isToggled={props.prefs.isSidebarOpen} />
      <StyledSidebarToggleIcon
        cursor="pointer"
        onClick={props.prefs.toggleSidebar}
        title="Sidebar Toggle"
      />

      <StyledTopSectionFlex
        direction={FlexDirections.COLUMN}
        height={`calc(100% - ${bottomSectionHeight + 2}px)`}
      >
        <SomedaySection flex={1} />
      </StyledTopSectionFlex>

      {/* <StyledDividerWrapper
        onMouseDown={() => {
          setIsDividerDragging(true);
        }}
      > */}
      <Divider
        color={getAlphaColor(ColorNames.WHITE_4, 0.5)}
        role="separator"
        title="sidebar divider"
        withAnimation={false}
      />
      {/* </StyledDividerWrapper> */}

      <StyledBottomSection height={String(bottomSectionHeight)}>
        <ToggleableMonthWidget
          isToggled={isCalendarsToggled}
          monthsShown={monthsShown}
          setIsToggled={setIsCalendarsToggled}
          setWeek={props.weekProps.state.setWeek}
        />
      </StyledBottomSection>
    </Styled>
  );
};
