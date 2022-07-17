import styled from "styled-components";
import { Priorities } from "@core/constants/core.constants";
import {
  getColor,
  getInvertedColor,
  hoverColorsByPriority,
} from "@core/util/color.utils";
import { InvertedColorNames } from "@core/constants/colors";
import { colorNameByPriority } from "@core/constants/colors";

export interface Props {
  priority: Priorities;
  isDragging?: boolean;
}

export const SOMEDAY_EVENT_HEIGHT = 32;

export const StyledEventOrPlaceholder = styled.div<Props>`
  background: ${({ priority }) => getColor(colorNameByPriority[priority])};
  border-radius: 2px;
  color: ${({ priority }) =>
    getInvertedColor(
      colorNameByPriority[priority] as unknown as InvertedColorNames
    )};
  height: ${SOMEDAY_EVENT_HEIGHT}px;
  width: 100%;
  margin-bottom: 2px;
  opacity: ${({ isDragging }) => isDragging && 0.5};
  padding: 5px;
  transition: background-color 0.2s, box-shadow 0.2s;

  &:hover {
    background: ${({ priority }) => hoverColorsByPriority[priority]};
    color: ${({ priority }) =>
      getInvertedColor(
        colorNameByPriority[priority] as unknown as InvertedColorNames
      )};
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
