import React, { FC, useEffect } from "react";
import { Dayjs } from "dayjs";
import { ColorNames } from "@core/types/color.types";
import { getAlphaColor, getColor } from "@core/util/color.utils";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { TodayButton } from "@web/views/Calendar/components/TodayButton";
import { getWeekDayLabel } from "@web/common/utils/event.util";
import { WEEK_DAYS_HEIGHT } from "@web/views/Calendar/layout.constants";
import { RootProps } from "@web/views/Calendar/calendarView.types";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { selectIsRightSidebarOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { Util_Scroll } from "@web/views/Calendar/hooks/grid/useScroll";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { HamburgerIcon } from "@web/components/Icons/HamburgerIcon";
import { selectSyncState } from "@web/ducks/events/selectors/sync.selector";
import { resetEventChanged } from "@web/ducks/events/slices/sync.slice";

import {
  StyledHeaderRow,
  StyledNavigationButtons,
  ArrowNavigationButton,
  StyledWeekDaysFlex,
  StyledWeekDayFlex,
  StyledLeftGroup,
  StyledRightGroup,
  StyledHeaderLabel,
  StyledNavigationArrows,
} from "./styled";

interface Props {
  rootProps: RootProps;
  scrollUtil: Util_Scroll;
  today: Dayjs;
  weekProps: WeekProps;
}

export const Header: FC<Props> = ({
  rootProps,
  scrollUtil,
  today,
  weekProps,
}) => {
  const dispatch = useAppDispatch();

  const { isDrafting } = useAppSelector(selectDraftId);
  const isRightSidebarOpen = useAppSelector(selectIsRightSidebarOpen);
  /* start POC */
  // next steps:
  //  - check if it's not already present (eg if change originally came from Compass)
  //  - if still relevant, add new console log
  //  - then render refresh button with tooltip explaining
  //    that the event data is stale
  //  - on click, refetch the events
  //    - ideally you can just dispatch the event so the whole page
  //      doesnt need to be re-rendered
  //      as backup, can run window.reload
  // TODO reduce re-rendering
  const { eventChanged, eventData } = useAppSelector(selectSyncState);

  const isEventInView = (eventStartDate: string, eventEndDate: string) => {
    return true;
    // const eventStart = new Date(eventStartDate);
    // const eventEnd = new Date(eventEndDate);
    // const viewStart = new Date(currentViewStartDate);
    // const viewEnd = new Date(currentViewEndDate);

    // return (
    //   (eventStart >= viewStart && eventStart <= viewEnd) ||
    //   (eventEnd >= viewStart && eventEnd <= viewEnd)
    // );
  };

  useEffect(() => {
    if (eventChanged && eventData) {
      if (isEventInView(eventData.startDate, eventData.endDate)) {
        console.log("Event is in the current view");
        // Render the refresh button
      }
      // Reset the eventChanged state after handling
      dispatch(resetEventChanged());
    }
  }, [eventChanged, eventData, dispatch]);
  /* end POC */
  const { scrollToNow } = scrollUtil;

  const onSectionClick = () => {
    if (isDrafting) {
      dispatch(draftSlice.actions.discard());
      return;
    }
  };

  const onTodayClick = () => {
    if (!weekProps.component.isCurrentWeek) {
      weekProps.util.goToToday();
    }
    scrollToNow();
  };

  return (
    <>
      <StyledHeaderRow
        alignItems={AlignItems.FLEX_START}
        onClick={onSectionClick}
      >
        <StyledLeftGroup>
          <StyledHeaderLabel aria-level={1} role="heading">
            <Text colorName={ColorNames.WHITE_1} size={40}>
              {weekProps.component.startOfView.format("MMMM")}
            </Text>

            <SpaceCharacter />

            <Text colorName={ColorNames.GREY_4} size={38}>
              {weekProps.component.startOfView.format("YYYY")}
            </Text>
          </StyledHeaderLabel>

          <StyledNavigationButtons>
            <TooltipWrapper
              description={today.format("dddd, MMMM D")}
              onClick={onTodayClick}
              shortcut="T"
            >
              <TodayButton />
            </TooltipWrapper>

            <StyledNavigationArrows>
              <TooltipWrapper
                onClick={() => weekProps.util.decrementWeek()}
                shortcut="J"
              >
                <ArrowNavigationButton
                  colorName={ColorNames.GREY_4}
                  cursor="pointer"
                  role="navigation"
                  size={35}
                  title="previous week"
                >
                  {"<"}
                </ArrowNavigationButton>
              </TooltipWrapper>

              <TooltipWrapper
                onClick={() => weekProps.util.incrementWeek()}
                shortcut="K"
              >
                <ArrowNavigationButton
                  colorName={ColorNames.GREY_4}
                  cursor="pointer"
                  role="navigation"
                  size={35}
                  title="next week"
                >
                  {">"}
                </ArrowNavigationButton>
              </TooltipWrapper>
            </StyledNavigationArrows>
          </StyledNavigationButtons>
        </StyledLeftGroup>

        <StyledRightGroup>
          <TooltipWrapper
            description={`${isRightSidebarOpen ? "Collapse" : "Open"} settings`}
            onClick={() => {
              dispatch(settingsSlice.actions.toggleRightSidebar());
            }}
            shortcut="]"
          >
            <HamburgerIcon />
          </TooltipWrapper>
        </StyledRightGroup>
      </StyledHeaderRow>

      <StyledWeekDaysFlex>
        {weekProps.component.weekDays.map((day) => {
          const isDayInCurrentWeek = today.week() === weekProps.component.week;
          const isToday =
            isDayInCurrentWeek && today.format("DD") === day.format("DD");

          let weekDayTextColor = isToday
            ? getColor(ColorNames.TEAL_3)
            : getAlphaColor(ColorNames.WHITE_1, 0.72);

          let dayNumberToDisplay = day.format("D");

          dayNumberToDisplay =
            day.format("MM") !== weekProps.component.startOfView.format("MM") &&
            day.format("D") === "1"
              ? day.format("MMM D")
              : dayNumberToDisplay;

          if (day.isBefore(rootProps.component.today, "day")) {
            weekDayTextColor = getAlphaColor(ColorNames.WHITE_1, 0.55);
          }

          return (
            <StyledWeekDayFlex
              justifyContent={JustifyContent.CENTER}
              key={getWeekDayLabel(day)}
              alignItems={AlignItems.FLEX_END}
              title={getWeekDayLabel(day)}
              color={weekDayTextColor}
            >
              <Text lineHeight={WEEK_DAYS_HEIGHT} size={WEEK_DAYS_HEIGHT}>
                {dayNumberToDisplay}
              </Text>
              <SpaceCharacter />
              <Text size={12}>{day.format("ddd")}</Text>
            </StyledWeekDayFlex>
          );
        })}
      </StyledWeekDaysFlex>
    </>
  );
};
