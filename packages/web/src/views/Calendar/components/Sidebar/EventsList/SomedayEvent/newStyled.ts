import styled from "styled-components";
import { Priorities } from "@core/constants/core.constants";
import {
  getColor,
  getInvertedColor,
  hoverColorsByPriority,
} from "@core/util/color.utils";
import { colorNameByPriority } from "@core/constants/colors";
import { InvertedColorNames } from "@core/types/color.types";

// export interface Props extends DroppableProps {
export interface Props {
  priority: Priorities;
  isDrafting: boolean;
  isDragging?: boolean;
  isOverGrid: boolean;
  isFocused: boolean;
}

export const SOMEDAY_EVENT_HEIGHT = 32;

export const NewStyledSomedayEvent = styled.div<Props>`
  background: ${({ isDrafting, isDragging, priority }) => {
    if (isDrafting) {
      return hoverColorsByPriority[priority];
    }
    if (isDragging) return "lightgreen";

    return getColor(colorNameByPriority[priority]);
  }};
  border-radius: 2px;
  color: ${({ priority }) =>
    getInvertedColor(
      colorNameByPriority[priority] as unknown as InvertedColorNames
    )};
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
  width: 100%;

  &:hover {
    background: ${({ priority }) => hoverColorsByPriority[priority]};
    color: ${({ priority }) =>
      getInvertedColor(
        colorNameByPriority[priority] as unknown as InvertedColorNames
      )};
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
