import styled from "styled-components";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";
import { SIDEBAR_MONTH_HEIGHT } from "@web/views/Calendar/layout.constants";

const _hoverStyle = `
  background-color: ${getColor(ColorNames.BLUE_5)};
`;

export const ChangeDayButtonsStyledFlex = styled(Flex)`
  & span {
    padding: 0 9px;
    border-radius: 50%;

    &:hover {
      ${_hoverStyle}
    }

    &:first-child {
      margin-right: 10px;
    }
  }
`;

export const MonthContainerStyled = styled(Flex)`
  width: 97px;
`;

export const StyledDatePicker = styled.div<{
  monthsCount?: number;
  view: "widget" | "picker";
}>`
  background-color: ${getColor(ColorNames.GREY_3)};
  border: none;
  border-radius: 2px;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  font-weight: 500;
  font-size: 12px;
  user-select: none;

  & .react-datepicker {
    &__month-container {
      width: 100%;
      padding: 0 15px 0 15px;
      height: 285px;
      display: flex;
      flex-direction: column;
    }

    &__month {
      margin: 0;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    &__week {
      align-items: center;
      display: flex;
      justify-content: space-between;
      flex-basis: calc(100% / 6);
      width: 100%;

      &:hover {
        ${({ view }) =>
          view === "widget" &&
          `background-color: ${getColor(ColorNames.GREY_2)}`};
      }
    }

    &__header {
      align-items: left;
      background: unset;
      border-bottom: none;
      padding: 8px 0 0 2px;
    }

    &__day-name {
      opacity: 0.8;
      color: ${getColor(ColorNames.WHITE_3)};
      font-size: 11px;
      margin: 0;
    }

    &__day {
      border: none !important;
      border-radius: 50% !important;
      color: white;
      margin: 0;

      &:hover {
        ${_hoverStyle}
      }

      &-names {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 6px;
      }

      &--selected {
        background-color: ${getColor(ColorNames.BLUE_5)};
      }

      &--today {
        background-color: ${getColor(ColorNames.GREY_1)};
        color: ${getColor(ColorNames.GREY_4)};
        font-weight: normal;
      }

      &--outside-month {
        color: ${getColor(ColorNames.WHITE_3)}99;
      }
    }
  }

  &.calendar {
    height: 0;
    width: 414px;
    overflow: hidden;

    &--open {
      height: ${SIDEBAR_MONTH_HEIGHT}px;
    }

    &--animation {
      transition: 0.3s;
    }
  }
`;

export const StyledHeaderFlex = styled(Flex)`
  padding: 0 5px 5px 8px;
`;
export const TodayStyledText = styled(Text)<{ isCurrentDate: boolean }>`
  margin-right: 40px;
  padding: 0px 6px;
  opacity: ${({ isCurrentDate }) => (isCurrentDate ? 0 : 1)};

  &:hover {
    ${_hoverStyle}
  }
`;
