import styled from "styled-components";
import { darken } from "@core/util/color.utils";

export const StyledRecurrenceSection = styled.div`
  display: flex;
  flex-basis: 100%;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

export const StyledRecurrenceRepeatCountSelect = styled.div`
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
  &:hover {
    background-color: ${({ theme }) => theme.color.bg.primary};
    color: ${({ theme }) => theme.color.text.light};
  }
  ${({ selected, bgColor, theme }) =>
    selected &&
    `
    background-color: ${darken(bgColor, 50)};
    color: ${theme.getContrastText(bgColor)};
  `}
`;

export const StyledRepeatCountInput = styled.input<{
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
