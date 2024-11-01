import styled from "styled-components";
import { DroppableProvided } from "@hello-pangea/dnd";
import { Priorities } from "@core/constants/core.constants";
import { brighten } from "@core/util/color.utils";
import {
  colorByPriority,
  hoverColorByPriority,
} from "@web/common/styles/theme.util";

export interface Props extends DroppableProvided {
  priority: Priorities;
  isDrafting: boolean;
  isDragging?: boolean;
  isOverGrid: boolean;
  isFocused: boolean;
}

export const SOMEDAY_EVENT_HEIGHT = 32;

export const StyledMigrateArrow = styled.span`
  padding-left: 7px;
  padding-right: 7px;

  &:hover {
    border-radius: 50%;
    background: ${({ theme }) => theme.color.bg.primary};
    color: white;
    cursor: pointer;
    padding-right: 7px;
    padding-left: 7px;
    text-align: center;
    transition: background-color 0.4s;
  }
`;

export const StyledRecurrenceText = styled.span`
  border: 1px solid ${({ theme }) => theme.color.border.primary};
  border-radius: 2px;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  width: 43px;

  &:hover {
    opacity: 1;
    transition: border ease-in 0.2s;
  }
`;

export const StyledMigrateArrowInForm = styled(StyledMigrateArrow)`
  font-size: 27px;
`;

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
  filter: brightness(
    ${({ isDragging, isFocused }) =>
      isFocused && !isDragging ? "160%" : "100%"}
  );
  margin-bottom: 2px;
  opacity: ${({ isDragging, isOverGrid }) => {
    if (isDragging && isOverGrid) return 0;
    return 1;
  }};
  padding: 5px;
  transition: background-color 0.2s, box-shadow 0.2s;
  width: 298px;

  &:hover {
    background: ${({ priority }) => hoverColorByPriority[priority]};
    cursor: pointer;
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
