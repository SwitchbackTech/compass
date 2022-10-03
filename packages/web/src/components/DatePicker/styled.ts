import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";

export interface Props {
  monthsCount?: number;
}

const _hoverStyle = `
  background-color: ${getColor(ColorNames.BLUE_4)};
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

export const Styled = styled.div<Props>`
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
      padding: 0 15px 15px 15px;
      height: 300px;
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      flex-basis: calc(100% / 6);
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
        border-radius: 50%;
      }

      &--today {
        font-weight: normal;
        background-color: ${getColor(ColorNames.GREY_1)};
        color: ${getColor(ColorNames.GREY_4)};
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
      height: ${({ monthsCount = 1 }) => monthsCount * 300}px;
    }

    &--animation {
      transition: 0.3s;
    }
  }
`;

export const StyledHeaderFlex = styled(Flex)`
  padding: 0 5px 5px 8px;
`;

export const TodayStyledText = styled(Text)`
  margin-right: 40px;
  padding: 0px 6px;

  &:hover {
    ${_hoverStyle}
  }
`;
