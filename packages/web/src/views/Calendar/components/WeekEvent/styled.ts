import styled from "styled-components";

import { getColor } from "@web/common/helpers/colors";
import { colorNameByPriority } from "@web/common/styles/colors";
import { Priorities } from "@web/common/types/entities";
import { ColorNames } from "@web/common/types/styles";

export interface StyledEventProps {
  left: number;
  top: number;
  priority: Priorities;
  duration: number;
  height: number;
  isTimeShown: boolean;
  width: number;
  isDragging: boolean;
  isPlaceholder: boolean;
  allDay: boolean;
}

const hoverColorsByPriority = {
  [Priorities.WORK]: getColor(ColorNames.GREY_5_BRIGHT),
  [Priorities.RELATIONS]: getColor(ColorNames.GREY_7_BRIGHT),
  [Priorities.SELF]: getColor(ColorNames.BLUE_3_BRIGHT),
};

export const StyledEvent = styled.div<StyledEventProps>`
  position: absolute;
  top: ${({ top }) => top}px;
  left: ${({ left }) => left}px;
  width: ${({ width }) => width}px;
  height: ${({ height }) => height}px;
  background-color: ${({ priority }) =>
    getColor(colorNameByPriority[priority])};
  border-radius: 4px;
  padding: ${({ duration, allDay }) =>
    !allDay && duration > 0.5 ? "4px" : "0 4px"};
  user-select: none;
  transition: background-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 0 0 transparent;
  cursor: ${({ isDragging }) => (isDragging ? "grabbing" : "pointer")};
  opacity: ${({ isPlaceholder }) => isPlaceholder && 0.5};

  &:hover,
  &.active {
    background-color: ${({ priority }) => hoverColorsByPriority[priority]};
    box-shadow: 0 4px 4px ${({ priority }) => hoverColorsByPriority[priority]};
  }

  & span {
    &:first-child {
      width: ${({ width, isTimeShown }) =>
        !isTimeShown || width < 125 ? "100%" : "calc(100% - 65px)"};
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-all;

      -webkit-line-clamp: ${({ duration }) => {
        const heightOfEvent = 54 * duration;

        return `${Math.round((heightOfEvent - 7) / 16) || 1}`;
      }};
    }
  }
`;

export interface ScalerProps {
  top?: string;
  bottom?: string;
}

export const StyledEventScaler = styled.div<ScalerProps>`
  position: absolute;
  width: 100%;
  height: 9px;
  opacity: 0;
  left: 0;
  top: ${({ top }) => top};
  bottom: ${({ bottom }) => bottom};
  cursor: row-resize;
`;
