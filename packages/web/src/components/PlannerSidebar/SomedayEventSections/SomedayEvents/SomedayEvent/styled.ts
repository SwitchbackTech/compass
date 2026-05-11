import styled from "styled-components";
import { type Priorities } from "@core/constants/core.constants";
import { brighten } from "@core/util/color.utils";
import { SOMEDAY_EVENT_HEIGHT } from "@web/common/constants/web.constants";
import {
  colorByPriority,
  hoverColorByPriority,
} from "@web/common/styles/theme.util";

export interface Props {
  priority: Priorities;
  isDrafting: boolean;
  isDragging?: boolean;
  isOverGrid: boolean;
  isFocused: boolean;
}

export const StyledNewSomedayEvent = styled.div<Props>`
  background: ${({ isDrafting, isDragging, priority }) => {
    if (isDrafting) {
      if (isDragging) {
        return brighten(colorByPriority[priority]);
      }
      return hoverColorByPriority[priority];
    }

    return colorByPriority[priority];
  }};

  border-radius: 2px;
  color: ${({ theme }) => theme.color.text.dark};
  height: ${SOMEDAY_EVENT_HEIGHT}px;
  filter: brightness(${({ isFocused }) => (isFocused ? "160%" : "100%")});
  margin-bottom: 2px;
  opacity: ${({ isDragging, isOverGrid }) => {
    if (isDragging && isOverGrid) return 0;
    return 1;
  }};
  font-size: 12px;
  padding: 4px;
  transition:
    background-color 0.2s,
    box-shadow 0.2s;
  width: 100%;

  &:hover {
    background: ${({ priority }) => hoverColorByPriority[priority]};
    cursor: pointer;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.text.accent};
    outline-offset: 2px;
  }

  & span {
    &:first-child {
      display: -webkit-box;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-all;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
    }
  }
`;
