import React, { useEffect, useState } from "react";
import { Popover } from "react-tiny-popover";
import dayjs from "dayjs";

import { Priorities } from "@core/core.constants";

import { ColorNames } from "@web/common/types/styles";
import { Text } from "@web/components/Text";
import {
  SidebarCollapseIcon,
  SidebarOpenIcon,
  StrawberryMenuIcon,
} from "@web/assets/svg";
import {
  AlignItems,
  FlexDirections,
  JustifyContent,
} from "@web/components/Flex/styled";
import { getAlphaColor, getColor } from "@web/common/helpers/colors";
import { colorNameByPriority } from "@web/common/styles/colors";
import { Divider } from "@web/components/Divider";
import { YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT } from "@web/common/constants/dates";
import { SidebarFutureEventsContainer } from "@web/views/Calendar/containers/SidebarFutureEventsContainer";
import { SidebarCurrentMonthEventsContainer } from "@web/views/Calendar/containers/SidebarCurrentMonthEventsContainer";

import {
  Styled,
  StyledTopSectionFlex,
  StyledFiltersPopoverContent,
  StyledCheckBox,
  StyledPriorityFilterItem,
  StyledPriorityFilterButton,
  StyledBottomSection,
  StyledDividerWrapper,
  renderStyledSidebarToggleIcon,
  StyledHeaderFlex,
  StyledSidebarOverflow,
  StyledFutureEventsToggleableSection,
} from "./styled";
import { ToggleableEventsListSection } from "./ToggleableEventsListSection";
import { ToggleableMonthWidget } from "./ToggleableMonthWidget";

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

export const Sidebar: React.FC<React.HTMLAttributes<HTMLDivElement>> = (
  props
) => {
  const [isToggled, setIsToggled] = useState(true);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>({
    relations: true,
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

  const onChangePriorityFilter =
    (name: keyof PriorityFilter) => (value: boolean) => {
      setPriorityFilter((filter) => ({ ...filter, [name]: value }));
    };

  const renderPriorityFilter = (priorityKey: Priorities) => (
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

  const getEventsSectionFlex = (sectionType: "currentMonth" | "future") => {
    const dividerIndexBySectionType = {
      currentMonth: isCurrentMonthToggled && 1,
      future: isFutureToggled && 1,
    };

    return dividerIndexBySectionType[sectionType] || undefined;
  };

  const onMouseUp = () => {
    setIsDividerDragging(false);
  };

  return (
    <Styled
      {...props}
      isToggled={isToggled}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <StyledSidebarOverflow isToggled={isToggled} />
      <StyledSidebarToggleIcon
        cursor="pointer"
        onClick={() => setIsToggled((toggle) => !toggle)}
      />

      <StyledTopSectionFlex
        direction={FlexDirections.COLUMN}
        height={`calc(100% - ${bottomSectionHeight + 2}px)`}
      >
        <StyledHeaderFlex
          alignItems={AlignItems.CENTER}
          justifyContent={JustifyContent.SPACE_BETWEEN}
        >
          <Text size={30} colorName={ColorNames.WHITE_1}>
            Someday List
          </Text>

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
          </Popover>
        </StyledHeaderFlex>

        <ToggleableEventsListSection
          flex={getEventsSectionFlex("currentMonth")}
          isToggled={isCurrentMonthToggled}
          onToggle={() => setIsCurrentMonthToggled((toggle) => !toggle)}
          title="This Month"
          priorities={
            Object.keys(priorityFilter).filter(
              (key) => priorityFilter[key as Priorities]
            ) as Priorities[]
          }
          EventsListContainer={SidebarCurrentMonthEventsContainer}
          sectionType="currentMonth"
        />

        <StyledFutureEventsToggleableSection
          shouldSetTopMargin={isCurrentMonthToggled}
          flex={getEventsSectionFlex("future")}
          eventStartDate={dayjs()
            .add(1, "month")
            .format(YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT)}
          isToggled={isFutureToggled}
          onToggle={() => setIsFutureToggled((toggle) => !toggle)}
          title="Future"
          priorities={
            Object.keys(priorityFilter).filter(
              (key) => priorityFilter[key as Priorities]
            ) as Priorities[]
          }
          EventsListContainer={SidebarFutureEventsContainer}
          sectionType="future"
        />
      </StyledTopSectionFlex>

      <StyledDividerWrapper
        onMouseDown={() => {
          setIsDividerDragging(true);
        }}
      >
        <Divider
          withAnimation={false}
          color={getAlphaColor(ColorNames.WHITE_4, 0.5)}
        />
      </StyledDividerWrapper>

      <StyledBottomSection height={String(bottomSectionHeight)}>
        <ToggleableMonthWidget
          setIsToggled={setIsCalendarsToggled}
          isToggled={isCalendarsToggled}
          monthsShown={monthsShown}
        />
      </StyledBottomSection>
    </Styled>
  );
};
