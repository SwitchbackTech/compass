import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";
import { ColorNames } from "@web/common/types/styles";
import { getColor } from "@web/common/utils/colors";

export interface Props {
  monthsCount?: number;
}

const _dayHoverStyles = `
  background-color: ${getColor(ColorNames.BLUE_5)};
  color: ${getColor(ColorNames.DARK_2)};
`;

export const ChangeDayButtonsStyledFlex = styled(Flex)`
  & span {
    padding: 0 9px;
    border-radius: 50%;

    &:hover {
      ${_dayHoverStyles}
    }

    &:first-child {
      margin-right: 10px;
    }
  }
`;

export const MonthContainerStyled = styled(Flex)`
  padding-right: 20px;
`;

export const Styled = styled.div<Props>`
  background-color: ${getColor(ColorNames.DARK_3)};
  border: none;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  font-weight: 500;
  font-size: 12px;
  user-select: none;

  & .react-datepicker {
    &__month-container {
      width: 100%;
      padding: 0 15px 15px 15px;
      height: 346px;
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
      background: unset;
      border-bottom: none;
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
        ${_dayHoverStyles}
      }

      &-names {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 6px;
      }

      &--selected {
        color: ${getColor(ColorNames.WHITE_2)};
        background-color: ${getColor(ColorNames.TEAL_2)};
        border-radius: 50%;
      }

      &--today {
        font-weight: normal;
        background-color: ${getColor(ColorNames.BLUE_2)}b2;
        color: ${getColor(ColorNames.WHITE_2)};
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
      height: ${({ monthsCount = 1 }) => monthsCount * 346}px;
    }

    &--animation {
      transition: 0.3s;
    }
  }
`;

export const StyledHeaderFlex = styled(Flex)`
  padding: 10px 20px 8px 20px;
`;

export const TodayStyledText = styled(Text)`
  margin-right: 40px;
  padding: 0px 6px;

  &:hover {
    ${_dayHoverStyles}
  }
`;
