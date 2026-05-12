import styled from "styled-components";
import { brighten, darken, isDark } from "@core/util/color.utils";
import { theme } from "@web/common/styles/theme";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";
import { SIDEBAR_MONTH_HEIGHT } from "@web/views/Week/layout.constants";

const SIDEBAR_COMPACT_MONTH_HEIGHT = 252;

const _hoverStyle = `
  background-color: ${theme.color.fg.primary}; 
  color: ${theme.color.text.dark};
`;

export const ChangeDayButtonsStyledFlex = styled(Flex)`
  gap: 4px;
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
  font-size: ${({ view }) => (view === "sidebar" ? "11px" : "12px")};
  user-select: none;

  & .react-datepicker {
    &__month-container {
      width: 100%;
      padding: ${({ view }) => (view === "sidebar" ? "0" : "0 15px")};
      height: ${({ view }) =>
        view === "sidebar" ? `${SIDEBAR_COMPACT_MONTH_HEIGHT}px` : "285px"};
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
    }

    &__header {
      align-items: left;
      background: unset;
      border-bottom: none;
      padding: ${({ view }) =>
        view === "sidebar" ? "8px 0 0" : "8px 0 0 2px"};
    }

    &__day-name {
      opacity: 0.8;
      color: ${({ theme, isDark }) =>
        isDark ? theme.color.text.light : theme.color.text.dark};
      font-size: ${({ view }) => (view === "sidebar" ? "10px" : "11px")};
      margin: 0;
    }

    &__day {
      border: none !important;
      border-radius: 50% !important;
      color: ${({ theme, isDark }) =>
        isDark ? theme.color.text.lighter : theme.color.text.dark};
      height: ${({ view }) => (view === "sidebar" ? "1.55rem" : "1.7rem")};
      line-height: ${({ view }) => (view === "sidebar" ? "1.55rem" : "1.7rem")};
      margin: 0;
      width: ${({ view }) => (view === "sidebar" ? "1.55rem" : "1.7rem")};

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
        color: ${({ theme }) => theme.color.text.lighter};
      }

      &--today:not(.react-datepicker__day--selected) {
        color: ${({ view }) =>
          view === "sidebar" ? theme.color.text.accent : theme.color.text.dark};
        text-decoration: underline;
        text-decoration-color: ${({ view }) =>
          view === "sidebar" ? theme.color.text.accent : theme.color.text.dark};
        text-underline-offset: 3px;

        &:hover {
          color: ${({ theme }) => theme.color.text.dark};
        }
      }

      &--keyboard-selected {
        background-color: ${({ view }) =>
          view === "sidebar" ? "transparent" : theme.color.bg.primary};
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
        height: ${({ view }) =>
          view === "sidebar"
            ? `${SIDEBAR_COMPACT_MONTH_HEIGHT}px`
            : `${SIDEBAR_MONTH_HEIGHT}px`};
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
