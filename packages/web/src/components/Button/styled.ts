import styled from "styled-components";
import { Priorities, Priority } from "@core/constants/core.constants";
import { brighten, darken } from "@core/util/color.utils";
import { colorByPriority } from "@web/common/styles/theme.util";

export const Btn = styled.div`
  align-items: center;
  border-radius: 2px;
  display: flex;
  justify-content: center;
  cursor: pointer;
`;

interface PalletteProps {
  color?: string;
  bordered?: boolean;
  border?: string;
}

export const PriorityButton = styled(Btn)<PalletteProps>`
  background: color;
  color: ${({ theme }) => theme.color.text.dark};
  min-width: 158px;
  padding: 0 8px;
  border: ${({ border, bordered, theme }) =>
    border || (bordered && `2px solid ${theme.color.border.primaryDark}`)};

  &:hover {
    background: ${({ theme }) => theme.color.bg.primary};
    color: ${({ color }) => brighten(color!)};
    transition: background-color 0.5s;
    transition: color 0.55s;
  }
`;
interface CustomProps {
  priority: Priority;
  minWidth: number;
  disabled?: boolean;
}

export const StyledSaveBtn = styled(PriorityButton)<CustomProps>`
  background: ${({ priority }) => darken(colorByPriority[priority])};
  color: ${({ theme }) => theme.color.text.dark}

  min-width: ${({ minWidth }) => minWidth}px;

  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  pointer-events: ${({ disabled }) => (disabled ? "none" : "auto")};

  &:focus {
    border: 2px solid ${({ theme }) => theme.color.border.primaryDark};
  }
  &:hover {
    color: ${({ priority, theme }) =>
      priority === Priorities.UNASSIGNED
        ? theme.color.text.light
        : brighten(colorByPriority[priority])};
  }
`;
