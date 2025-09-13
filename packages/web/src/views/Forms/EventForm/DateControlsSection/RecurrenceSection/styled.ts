import styled from "styled-components";
import { darken } from "@core/util/color.utils";

export const StyledEditRecurrence = styled.div`
  display: flex;
  align-items: center;
  flex-basis: 100%;
  cursor: pointer;
`;

export const StyledRecurrenceSection = styled.div`
  display: flex;
  flex-basis: 100%;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  position: relative;
  opacity: 0.7;
`;

export const StyledRecurrenceIntervalSelect = styled.div`
  display: flex;
  align-items: center;
  flex-basis: 100%;
`;

export const StyledWeekDaysContainer = styled.div`
  display: flex;
  flex-basis: 100%;
  gap: ${({ theme }) => theme.spacing.s};
`;

export const StyledWeekDayContainer = styled.div`
  width: fit-content;
`;

export const StyledWeekDay = styled.button<{
  bgColor: string;
  selected: boolean;
}>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.color.bg.primary};
  background-color: ${({ bgColor }) => bgColor};
  cursor: pointer;
  ${({ selected, theme }) =>
    !selected &&
    `
  &:hover {
    background-color: ${theme.color.bg.primary};
    color: ${theme.color.text.light};
    }
  `}

  ${({ selected, bgColor, theme }) =>
    selected &&
    `
    background-color: ${darken(bgColor, 30)};
    color: ${theme.getContrastText(bgColor)};
  `}
`;

export const StyledIntervalInput = styled.input<{
  bgColor: string;
}>`
  width: 32;
  height: 24px;
  border: 1px solid ${({ theme }) => theme.color.bg.primary};
  padding: 0 4px;
  background-color: ${({ bgColor }) => bgColor};
  margin-left: ${({ theme }) => theme.spacing.xs};

  /* Hide arrows/spinners */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox */
  &[type="number"] {
    -moz-appearance: textfield;
  }
`;

export const StyledCaretInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: ${({ theme }) => theme.spacing.xs};
  justify-content: space-between;
`;

export const StyledCaretButton = styled.button`
  background: none;
  color: inherit;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  height: 16px;
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background-color: ${({ theme }) => theme.color.bg.primary};
    color: ${({ theme }) => theme.color.text.light};
  }
`;

export const StyledEndsOnDate = styled.div`
  display: flex;
  align-items: center;
  flex-basis: 100%;
`;

export const StyledDisabledOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

export const StyledUpcomingFeature = styled.div`
  background-color: ${({ theme }) => theme.color.bg.primary};
  color: ${({ theme }) => theme.color.text.light};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.s};
  border-radius: 4px;
  font-size: 0.9em;
  text-align: center;
`;

export const StyledFreqSelect = styled.div`
  margin-right: ${({ theme }) => theme.spacing.s};
  width: 190px;

  .freq-select__control {
    background-color: transparent;
    border: 1px solid ${({ theme }) => theme.color.bg.primary};
    box-shadow: none;
    min-height: 24px;
    height: 24px;
    cursor: pointer;
  }

  .freq-select__control--is-focused {
    border-color: ${({ theme }) => theme.color.border.primaryDark};
    box-shadow: 0 0 0 1px ${({ theme }) => theme.color.bg.primary};
  }

  .freq-select__value-container {
    padding: 0 ${({ theme }) => theme.spacing.xs};
    height: 24px;
    font-size: 0.9em;
  }

  .freq-select__single-value {
    color: ${({ theme }) => theme.color.text.dark};
    line-height: 24px;
  }

  .freq-select__indicators {
    height: 24px;
  }

  .freq-select__indicator {
    padding: 0 4px;
    color: ${({ theme }) => theme.color.text.dark};
    transition: color 150ms;

    &:hover {
      color: ${({ theme }) => theme.color.text.darkPlaceholder};
    }
  }

  .freq-select__menu {
    background-color: ${({ theme }) => theme.color.bg.primary};
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    border: none;
    margin-top: 4px;
    border-radius: 4px;
    overflow: hidden;
    z-index: 10;
  }

  .freq-select__option {
    padding: ${({ theme }) => theme.spacing.s} ${({ theme }) => theme.spacing.m};
    cursor: pointer;
    font-size: 0.9em;
    color: ${({ theme }) => theme.color.text.light};
    background-color: transparent;
    transition:
      background-color 150ms,
      color 150ms;

    &:hover {
      background-color: ${({ theme }) => theme.color.bg.primary};
      color: ${({ theme }) => theme.color.text.light};
    }
  }

  .freq-select__option--is-selected {
    background-color: ${({ theme }) => theme.color.bg.primary};
    color: ${({ theme }) => theme.color.text.light};
  }
`;
