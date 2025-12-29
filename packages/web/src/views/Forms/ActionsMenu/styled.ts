import styled from "styled-components";

export const TriggerWrapper = styled.div`
  display: inline-flex;
`;

interface StyledMenuProps {
  bgColor: string;
}

export const StyledMenu = styled.div<StyledMenuProps>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: ${({ bgColor }) => bgColor};
  padding: 8px;
  border-radius: ${({ theme }) => theme.shape.borderRadius || "6px"};
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  z-index: 3;
`;

/**
 * Shared menu item styling for the EventActionMenu buttons.
 */
interface StyledMenuItemProps {
  bgColor: string;
}

export const StyledMenuItem = styled.button<StyledMenuItemProps>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  background-color: ${({ bgColor }) => bgColor};
  color: ${({ theme }) => theme.color.text.dark};
  font-size: ${({ theme }) => theme.text.size.m};
  text-align: left;

  &:hover {
    text-shadow: ${({ theme }) => `0 0 0.5px ${theme.color.text.dark},
      0 0 0.5px ${theme.color.text.dark}`};
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    text-shadow: ${({ theme }) => `0 0 0.5px ${theme.color.text.dark},
      0 0 0.5px ${theme.color.text.dark}`};
  }
`;
