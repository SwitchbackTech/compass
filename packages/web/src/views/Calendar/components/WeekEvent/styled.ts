import styled from "styled-components";
import { Priority, Priorities } from "@core/core.constants";
import { getColor } from "@web/common/utils/colors";
import { colorNameByPriority } from "@web/common/styles/colors";
import { ColorNames } from "@web/common/types/styles";

const hoverColorsByPriority = {
  [Priorities.UNASSIGNED]: getColor(ColorNames.GREY_5_BRIGHT),
  [Priorities.WORK]: getColor(ColorNames.GREY_3_BRIGHT),
  [Priorities.RELATIONS]: getColor(ColorNames.TEAL_4),
  [Priorities.SELF]: getColor(ColorNames.BLUE_3_BRIGHT),
};

interface StyledEventProps {
  allDay: boolean;
  duration: number;
  height: number;
  isDragging: boolean;
  isPlaceholder: boolean;
  isTimeShown: boolean;
  left: number;
  lineClamp: number;
  priority: Priority;
  width: number;
  top: number;
}

export const StyledEvent = styled.div.attrs<StyledEventProps>((props) => {
  const bgColor = getColor(colorNameByPriority[props.priority]);

  return {
    backgroundColor: bgColor,
    left: props.left,
    lineClamp: props.lineClamp,
    height: props.height,
    hoverColor: hoverColorsByPriority[props.priority],
    opacity: props.isPlaceholder ? 0.5 : 1,
    padding: !props.allDay && props.duration > 0.5 ? "4px" : "0 4px",
    top: props.top,
    width: props.width,
  };
})<StyledEventProps>`
  border-radius: 3px;
  position: absolute;
  top: ${(props) => props.top}px;
  left: ${(props) => props.left}px;
  width: ${(props) => props.width}px;
  height: ${({ height }) => height}px;
  background-color: ${(props) => props.backgroundColor};
  padding: ${(props) => props.padding};
  user-select: none;
  transition: background-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 0 0 transparent;
  cursor: ${({ isDragging }) => (isDragging ? "grabbing" : "pointer")};
  opacity: ${(props) => props.opacity};

  &:hover,
  &.active {
    background-color: ${(props) => props.hoverColor};
    filter: drop-shadow(2px 4px 4px black);
  }

  & span {
    &:first-child {
      display: -webkit-box;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-all;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: ${(props) => props.lineClamp};
    }
  }
`;

export interface ScalerProps {
  top?: string;
  bottom?: string;
}

export const StyledEventScaler = styled.div.attrs<ScalerProps>((props) => {
  return {
    top: props.top,
    bottom: props.bottom,
  };
})<ScalerProps>`
  position: absolute;
  width: 100%;
  height: 9px;
  opacity: 0;
  left: 0;
  top: ${(props) => props.top};
  bottom: ${(props) => props.bottom};
  cursor: ns-resize;
`;
