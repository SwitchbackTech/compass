import styled from "styled-components";
import { Priorities } from "@core/constants/core.constants";
import {
  getColor,
  getInvertedColor,
  hoverColorsByPriority,
} from "@core/util/color.utils";
import { BASE_COLORS, colorNameByPriority } from "@core/constants/colors";
import { InvertedColorNames } from "@core/types/color.types";

export interface Props {
  priority: Priorities;
  isDragging?: boolean;
  isDrafting: boolean;
}

export const SOMEDAY_EVENT_HEIGHT = 32;

export const StyledEventOrPlaceholder = styled.div<Props>`
  background: ${({ isDrafting, priority }) =>
    isDrafting
      ? hoverColorsByPriority[priority]
      : getColor(colorNameByPriority[priority])};

  border-radius: 2px;
  color: ${({ priority }) =>
    getInvertedColor(
      colorNameByPriority[priority] as unknown as InvertedColorNames
    )};

  height: ${SOMEDAY_EVENT_HEIGHT}px;
  margin-bottom: 2px;
  opacity: ${({ isDragging }) => isDragging && 0.5};
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

export const StyledMigrateArrow = styled.span`
  padding-right: 7px;
  color: #44484b;

  &:hover {
    border-radius: 50%;
    background: ${BASE_COLORS.ONYX_GREY};
    color: white;
    padding-right: 7px;
    padding-left: 7px;
    text-align: center;
    transition: background-color 0.4s;
  }
`;
