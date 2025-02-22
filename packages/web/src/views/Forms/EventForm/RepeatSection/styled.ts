import styled from "styled-components";
import { Flex } from "@web/components/Flex";

export const StyledRepeatContainer = styled.div`
  margin-bottom: 10px;
  &:hover {
    cursor: pointer;
  }
`;

export const StyledRepeatRow = styled(Flex)`
  align-items: center;
  flex-direction: row;
`;

interface Props {
  hasRepeat: boolean;
}

export const StyledRepeatText = styled.span<Props>`
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  font-size: ${({ theme }) => theme.text.size.m};
  opacity: ${({ hasRepeat }) => !hasRepeat && 0.85};
  padding: 2px 8px;

  &:focus,
  &:hover {
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
