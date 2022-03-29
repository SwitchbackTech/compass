import styled from "styled-components";
import { Priorities } from "@core/core.constants";
import { getColor } from "@web/common/utils/colors";
import { colorNameByPriority } from "@web/common/styles/colors";
import { ColorNames } from "@web/common/types/styles";

interface StyledEventProps {
  allDay: boolean;
  backgroundColor: string;
  duration: number;
  height: number;
  hoverColor: string;
  isDragging: boolean;
  isPlaceholder: boolean;
  isTimeShown: boolean;
  left: number;
  lineClamp: string;
  opacity: number;
  padding: string;
  priority: Priorities;
  width: number;
  top: number;
}

// $$ replace with inverted colors ?
const hoverColorsByPriority = {
  [Priorities.UNASSIGNED]: getColor(ColorNames.GREY_5_BRIGHT),
  [Priorities.WORK]: getColor(ColorNames.GREY_3_BRIGHT),
  [Priorities.RELATIONS]: getColor(ColorNames.TEAL_6_BRIGHT),
  [Priorities.SELF]: getColor(ColorNames.BLUE_3_BRIGHT),
};

export const StyledEvent = styled.button.attrs<StyledEventProps>((props) => {
  const bgColor = getColor(colorNameByPriority[props.priority]);

  const lineClamp = () => {
    // how where these magic numbers determined?
    const heightOfEvent = 54 * props.duration;
    return `${Math.round((heightOfEvent - 7) / 16) || 1}`;
  };
  return {
    backgroundColor: bgColor,
    left: props.left,
    lineClamp: lineClamp,
    height: props.height,
    hoverColor: hoverColorsByPriority[props.priority],
    opacity: props.isPlaceholder ? 0.5 : 1,
    padding: !props.allDay && props.duration > 0.5 ? "4px" : "0 4px",
    // caused bugs with title + width; $$ delete if not needed after a while
    // titleWidth: !props.isTimeShown || props.width < 125 ? "100%" : "calc(100% - 65px)",
    top: props.top,
    width: props.width,
  };
})<StyledEventProps>`
  border-radius: 4px;
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
  }

  & span {
    &:first-child {
      display: -webkit-box;
      overflow: hidden;
      text-overflow: ellipsis;
      /* width: "100%"; // titleWidth props logic <-- $$ deleted if not needed */
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
