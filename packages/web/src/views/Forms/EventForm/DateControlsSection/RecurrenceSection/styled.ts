import styled from "styled-components";
import { darken } from "@core/util/color.utils";
import { Flex } from "@web/components/Flex";

export const StyledRepeatContainer = styled.div`
  margin-bottom: 10px;
  &:hover {
    cursor: pointer;
  }
`;

export const StyledRepeatRow = styled(Flex)`
  align-items: center;
  flex-basis: 100%;
  gap: ${({ theme }) => theme.spacing.s};
`;

export const StyledRepeatText = styled.span<{
  hasRepeat: boolean;
}>`
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  font-size: ${({ theme }) => theme.text.size.m};
  opacity: ${({ hasRepeat }) => !hasRepeat && 0.85};
  padding: 2px 8px;

  &:focus,
  &:hover {
    cursor: pointer;
    border: ${({ hasRepeat, theme }) =>
      !hasRepeat && `1px solid ${theme.color.border.primaryDark}`};
  }
`;

export const StyledRepeatTextContainer = styled(Flex)`
  align-items: center;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  gap: 6px;
  justify-content: center;
  margin-right: 8px;
  padding: 2px 8px;

  &:focus,
  &:hover {
    border: 1px solid ${({ theme }) => theme.color.border.primaryDark};
    filter: brightness(90%);
    transition: border ${({ theme }) => theme.transition.default} ease;
  }
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
