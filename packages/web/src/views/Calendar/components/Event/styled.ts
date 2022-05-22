import styled from "styled-components";
import { Priority } from "@core/core.constants";
import { ZIndex } from "@web/common/constants/web.constants";
import { getColor, hoverColorsByPriority } from "@web/common/utils/colors";
import { colorNameByPriority } from "@web/common/styles/colors";

interface StyledEventProps {
  allDay: boolean;
  // duration: number;
  height: number;
  isDragging: boolean;
  isPlaceholder: boolean;
  left: number;
  // lineClamp: number;
  priority: Priority;
  // ref: React.ForwardedRef<HTMLButtonElement>; // not correct type $$
  width: number;
  top: number;
}

export const StyledEvent = styled.div.attrs<StyledEventProps>((props) => {
  const bgColor = getColor(colorNameByPriority[props.priority]);

  return {
    backgroundColor: bgColor,
    left: props.left,
    // lineClamp: props.lineClamp,
    height: props.height,
    hoverColor: hoverColorsByPriority[props.priority],
    opacity: props.isPlaceholder ? 0.5 : 1,
    // padding: !props.allDay && props.duration > 0.5 ? "4px" : "0 4px",
    ref: props.ref,
    top: props.top,
    width: props.width,
  };
})<StyledEventProps>`
  background-color: ${(props) => props.backgroundColor};
  border-radius: 3px;
  box-shadow: 0 0 0 0 transparent;
  cursor: ${({ isDragging }) => (isDragging ? "grabbing" : "pointer")};
  height: ${({ height }) => height}px;
  left: ${(props) => props.left}px;
  opacity: ${(props) => props.opacity};
  overflow: hidden;
  padding: 1px;
  position: absolute;
  top: ${(props) => props.top}px;
  transition: background-color 0.2s, box-shadow 0.2s;
  user-select: none;
  width: ${(props) => props.width}px;
  z-index: ${ZIndex.LAYER_1};

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
      /* -webkit-line-clamp: ${(props) => props.lineClamp}; */
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
