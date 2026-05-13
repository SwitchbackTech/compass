import styled from "styled-components";
import { type Priorities } from "@core/constants/core.constants";
import { colorByPriority } from "@web/common/styles/theme.util";

const SOMEDAY_EVENT_ROW_HEIGHT = 32;

const getPriorityTint = (priority: Priorities, mixPercent: number) =>
  `color-mix(in srgb, ${colorByPriority[priority]} ${mixPercent}%, transparent)`;

export interface Props {
  priority: Priorities;
  isDrafting: boolean;
  isDragging?: boolean;
  isOverGrid: boolean;
}

export const StyledNewSomedayEvent = styled.div<Props>`
  background: ${({ isDrafting, isDragging, priority }) => {
    if (isDrafting) {
      return getPriorityTint(priority, isDragging ? 45 : 35);
    }

    return getPriorityTint(priority, 15);
  }};

  border-radius: 2px;
  color: ${({ theme }) => theme.color.text.lighter};
  height: ${SOMEDAY_EVENT_ROW_HEIGHT}px;
  margin: 2px 0;
  opacity: ${({ isDragging, isOverGrid }) => {
    if (isDragging && isOverGrid) return 0;
    return 1;
  }};
  font-size: 12px;
  padding: 4px 8px;
  transition:
    background-color 0.2s,
    box-shadow 0.2s;
  width: 100%;

  cursor: ${({ isDragging }) => (isDragging ? "grabbing" : "grab")};

  &:hover {
    background: ${({ priority }) => getPriorityTint(priority, 25)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.text.accent};
    outline-offset: 2px;
  }
`;
