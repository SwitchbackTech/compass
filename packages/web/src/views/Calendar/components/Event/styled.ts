import styled from "styled-components";
import { Priority } from "@core/constants/core.constants";
import { brighten, darken } from "@core/util/color.utils";
import { ZIndex } from "@web/common/constants/web.constants";
import {
  colorByPriority,
  hoverColorByPriority,
} from "@web/common/styles/theme.util";
import { Text } from "@web/components/Text";

interface StyledEventProps {
  allDay: boolean;
  backgroundColor?: string;
  height: number;
  hoverColor?: string;
  isDragging: boolean;
  isInPast: boolean;
  isRecurring: boolean;
  isResizing: boolean;
  isPlaceholder: boolean;
  isOptimistic: boolean;
  left: number;
  lineClamp: number;
  opacity?: number;
  priority: Priority;
  top: number;
  width: number;
}

export const StyledEvent = styled.div.attrs<StyledEventProps>((props) => {
  const getBgColor = () => {
    if (props.isResizing || props.isDragging) {
      return brighten(colorByPriority[props.priority]);
    }

    const origColor = colorByPriority[props.priority];
    return origColor;
  };

  return {
    backgroundColor: getBgColor(),
    left: props.left,
    height: props.height,
    isInPast: props.isInPast,
    hoverColor: props.isPlaceholder
      ? null
      : hoverColorByPriority[props.priority],
    opacity: props.isPlaceholder ? 0.5 : null,
    ref: props.ref,
    top: props.top,
    width: props.width,
  };
})<StyledEventProps>`
  background-color: ${(props) => props.backgroundColor};
  border-radius: 2px;
  filter: ${({ isRecurring, isInPast }) =>
    isRecurring || isInPast ? "brightness(0.7)" : "brightness(1)"};
  height: ${({ height }) => height}px;
  left: ${(props) => props.left}px;
  opacity: ${(props) => props.opacity};
  overflow: hidden;
  padding-left: 5px;
  padding-right: 3px;
  position: absolute;
  top: ${(props) => props.top}px;

  user-select: none;
  width: ${(props) => props.width}px;
  z-index: ${ZIndex.LAYER_1};

  &:hover {
    transition: background-color 0.35s linear;

    ${({
      backgroundColor,
      isOptimistic,
      isPlaceholder,
      isDragging,
      isResizing,
      hoverColor,
      theme,
    }) =>
      !isPlaceholder &&
      !isResizing &&
      `
      background-color: ${isOptimistic ? darken(backgroundColor) : hoverColor};
      cursor: ${isDragging ? "move" : isOptimistic ? "wait" : "pointer"};
      drop-shadow(2px 4px 4px ${theme.color.shadow.default});
     `};
  }

  &.active {
    filter: drop-shadow(2px 4px 4px black);
    background-color: ${({ hoverColor }) => hoverColor};
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

export const StyledEventTitle = styled(Text)`
  min-height: 3px;
`;

export interface ScalerProps {
  showResizeCursor: boolean;
  bottom?: string;
  top?: string;
  zIndex?: number;
}

export const StyledEventScaler = styled.div.attrs<ScalerProps>((props) => {
  return {
    top: props.top,
    bottom: props.bottom,
  };
})<ScalerProps>`
  position: absolute;
  width: 100%;
  height: 4.5px;
  opacity: 0;
  left: 0;
  top: ${(props) => props.top};
  bottom: ${(props) => props.bottom};
  ${(props) => props.showResizeCursor && `cursor: row-resize`};
  ${({ zIndex }) => zIndex && `z-index: ${zIndex}`}
`;
