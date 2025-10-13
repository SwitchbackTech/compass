import styled from "styled-components";
import { darken } from "@core/util/color.utils";
import { Flex } from "@web/components/Flex";

export const StyledRepeatContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  cursor: pointer;
`;

export const StyledRepeatRow = styled(Flex)`
  align-items: center;
  flex-basis: 100%;
  gap: ${({ theme }) => theme.spacing.s};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  padding: 0;
  width: 100%;
`;

export const StyledRepeatText = styled.span<{
  hasRepeat: boolean;
}>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  font-size: ${({ theme }) => theme.text.size.m};
  opacity: ${({ hasRepeat }) => (!hasRepeat ? 0.85 : 1)};
  padding: 2px 8px;
  color: ${({ hasRepeat, theme }) =>
    hasRepeat ? theme.color.text.dark : theme.color.text.darkPlaceholder};
  transition: ${({ theme }) => theme.transition.default};

  svg {
    color: inherit;
    margin-right: ${({ theme }) => theme.spacing.xs};
  }

  &:hover {
    cursor: pointer;
    color: ${({ theme }) => theme.color.text.dark};
    background-color: ${({ theme }) => theme.color.border.primary};
  }
  &:focus {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.border.primaryDark};
  }
`;

export const StyledRepeatTextContainer = styled(Flex)`
  align-items: center;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  gap: ${({ theme }) => theme.spacing.xs};
  border: 1px solid transparent;
  justify-content: center;
  margin-right: 8px;
  padding: 2px 8px;
  color: ${({ theme }) => theme.color.text.darkPlaceholder};
  font-size: ${({ theme }) => theme.text.size.m};
  cursor: pointer;
  transition:
    color ${({ theme }) => theme.transition.default} ease,
    filter ${({ theme }) => theme.transition.default} ease;

  svg {
    color: currentColor;
    margin-right: ${({ theme }) => theme.spacing.xs};
    transition: inherit;
  }

  &:hover {
    color: ${({ theme }) => theme.color.text.dark};
    background-color: ${({ theme }) => theme.color.border.primary};
  }

  &:focus {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.border.primaryDark};
  }
`;

export const StyledWeekDay = styled.button<{
  bgColor: string;
  selected: boolean;
}>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.color.border.primaryDark};
  background-color: ${({ bgColor }) => bgColor};
  transition: ${({ theme }) => theme.transition.default};

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

  &:focus {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.border.primaryDark};
  }
`;

export const StyledIntervalInput = styled.input<{
  bgColor: string;
}>`
  width: 32px;
  height: 38px;
  border: 1px solid transparent;
  text-align: center;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  padding: 0 4px;
  background-color: ${({ bgColor }) => bgColor};
  margin-left: ${({ theme }) => theme.spacing.xs};
  transition: ${({ theme }) => theme.transition.default};

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

  &:hover {
    filter: brightness(90%);
  }

  &:focus {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.border.primaryDark};
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
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  padding: 0;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  height: 19px;
  width: 19px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${({ theme }) => theme.transition.default};

  &:hover {
    background-color: ${({ theme }) => theme.color.bg.primary};
    color: ${({ theme }) => theme.color.text.light};
  }
  &:focus {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.border.primaryDark};
  }
`;
