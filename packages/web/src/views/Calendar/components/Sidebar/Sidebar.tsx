import React, { useEffect, useState } from "react";
import { Priorities, Priority } from "@core/core.constants";
import { ColorNames } from "@web/common/types/styles";
import { Text } from "@web/components/Text";
import {
  AlignItems,
  FlexDirections,
  JustifyContent,
} from "@web/components/Flex/styled";
import { getAlphaColor, getColor } from "@web/common/utils/colors";
import { colorNameByPriority } from "@web/common/styles/colors";
import { Divider } from "@web/components/Divider";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { useDispatch } from "react-redux";
import { getFutureEventsSlice } from "@web/ducks/events/slice";

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
  weekViewProps: WeekViewProps;
}

export const Sidebar: React.FC<Props & React.HTMLAttributes<HTMLDivElement>> = (
  props
) => {
  const [isToggled, setIsToggled] = useState(true);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>({
    relationships: true,
    self: true,
    work: true,
  });

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

  const onChangePriorityFilter =
    (name: keyof PriorityFilter) => (value: boolean) => {
      setPriorityFilter((filter) => ({ ...filter, [name]: value }));
    };

  const onFilterButtonBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as Element;
    if (relatedTarget && relatedTarget.id === "priority-sort-popover") {
      return;
    }

    setIsFilterPopoverOpen(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDividerDragging) return;

    // 5 - top padding of divider container
    setBottomSectionHeight(window.innerHeight - e.clientY + 5);
  };

  const onMouseUp = () => {
    setIsDividerDragging(false);
  };

  const renderPriorityFilter = (priorityKey: Priority) => (
    <StyledPriorityFilterItem key={priorityKey} alignItems={AlignItems.CENTER}>
      <StyledCheckBox
        isChecked={priorityFilter[priorityKey]}
        onChange={onChangePriorityFilter(priorityKey)}
        color={getColor(colorNameByPriority[priorityKey])}
      />
      {priorityNameByKey[priorityKey]}
    </StyledPriorityFilterItem>
  );

  const StyledSidebarToggleIcon = renderStyledSidebarToggleIcon(isToggled);

  return (
    <Styled
      // {...props} //$$
      isToggled={isToggled}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      role="complementary"
    >
      <StyledSidebarOverflow isToggled={isToggled} />
      <StyledSidebarToggleIcon
        cursor="pointer"
        onClick={() => setIsToggled((toggle) => !toggle)}
        title="Sidebar Toggle"
      />

      <StyledTopSectionFlex
        direction={FlexDirections.COLUMN}
        height={`calc(100% - ${bottomSectionHeight + 2}px)`}
      >
        <StyledHeaderFlex
          alignItems={AlignItems.CENTER}
          justifyContent={JustifyContent.SPACE_BETWEEN}
        >
          <Text colorName={ColorNames.WHITE_1} role="heading" size={30}>
            Someday
          </Text>

          {/* 
          <Popover
            isOpen={isFilterPopoverOpen}
            positions={["bottom"]}
            align="end"
            content={
              <div
                onBlur={onFilterButtonBlur}
                tabIndex={0}
                role="button"
                id="priority-sort-popover"
              >
                <StyledFiltersPopoverContent>
                  {Object.keys(priorityFilter).map((priority) =>
                    renderPriorityFilter(priority as Priorities)
                  )}
                </StyledFiltersPopoverContent>
              </div>
            }
          >
            <StyledPriorityFilterButton
              role="button"
              tabIndex={0}
              onFocus={() => setIsFilterPopoverOpen(true)}
              onBlur={onFilterButtonBlur}
            >
            <StrawberryMenuIcon />
            </StyledPriorityFilterButton>
          </Popover> */}
        </StyledHeaderFlex>
        {/* <OldStyledSomedaySection
          shouldSetTopMargin={isCurrentMonthToggled}
          flex={getEventsSectionFlex("future")}
          startDate={dayjs().format(YEAR_MONTH_FORMAT)}
          isToggled={isFutureToggled}
          onToggle={() => setIsFutureToggled((toggle) => !toggle)}
          title=""
          priorities={
            Object.keys(priorityFilter).filter(
              (key) => priorityFilter[key as Priorities]
            ) as Priorities[]
          }
          EventsListContainer={SomedayEventsFutureContainer}
          sectionType="future"
        /> */}
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
          setWeek={props.weekViewProps.eventHandlers.setWeek}
        />
      </StyledBottomSection>
    </Styled>
  );
};
