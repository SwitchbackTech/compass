import styled from "styled-components";
import { brighten, compliment, darken, isDark } from "@core/util/color.utils";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";
import { SIDEBAR_MONTH_HEIGHT } from "@web/views/Calendar/layout.constants";
import { theme } from "@web/common/styles/theme";

const _hoverStyle = `
  background-color: ${theme.color.fg.primary}; 
  color: ${theme.color.text.dark};
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

interface Props {
  bgColor: string;
  isDark?: boolean;
  selectedColor: string;
  view: "grid" | "sidebar";
}

export const StyledDatePicker = styled.div.attrs<Props>((props) => ({
  bgColor: props.bgColor,
  isDark: isDark(props.bgColor),
  selectedColor: props.selectedColor,
  view: props.view,
}))<Props>`
  background-color: ${({ bgColor, view }) =>
    view === "sidebar" ? "transparent" : bgColor};
  border: none;
  border-radius: 2px;
  box-shadow: 0px 4px 4px ${({ theme }) => theme.color.shadow.default};
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
        ${({ view, theme }) =>
          view === "sidebar" &&
          `background-color: ${theme.color.fg.primaryDark}`};
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
      color: ${({ theme, isDark }) =>
        isDark ? theme.color.text.light : theme.color.text.dark};
      font-size: 11px;
      margin: 0;
    }

    &__day {
      border: none !important;
      border-radius: 50% !important;
      color: ${({ theme, isDark }) =>
        isDark ? theme.color.text.lighter : theme.color.text.dark};
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
        background-color: ${({ selectedColor }) => selectedColor};
      }

      &--today {
        color: ${({ view }) =>
          view === "sidebar" ? theme.color.text.accent : theme.color.text.dark};
        text-decoration: underline;
        text-decoration-color: ${({ view }) =>
          view === "sidebar" ? theme.color.text.accent : theme.color.text.dark};
        text-underline-offset: 3px;
      }

      &--keyboard-selected {
        background-color: ${theme.color.bg.primary};
      }

      &--outside-month {
        color: ${({ theme, isDark }) =>
          isDark
            ? darken(theme.color.text.light)
            : brighten(theme.color.text.dark)};
        opacity: 0.8;
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
    filter: brightness(160%);
    transition: filter 0.35s ease-out;
  }
`;
