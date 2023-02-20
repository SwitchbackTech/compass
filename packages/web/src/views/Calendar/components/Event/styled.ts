import styled from "styled-components";
import { Priority } from "@core/constants/core.constants";
import { ZIndex } from "@web/common/constants/web.constants";
import { getColor, hoverColorsByPriority } from "@core/util/color.utils";
import { colorNameByPriority } from "@core/constants/colors";

interface StyledEventProps {
  allDay: boolean;
  height: number;
  isDragging: boolean;
  isResizing: boolean;
  isInPast: boolean;
  isPlaceholder: boolean;
  left: number;
  // pastDimness: number;
  priority: Priority;
  top: number;
  width: number;
}

const pastDimness = 0.65;
export const StyledEvent = styled.div.attrs<StyledEventProps>((props) => {
  const getBgColor = () => {
    if (props.isResizing || props.isDragging) {
      return hoverColorsByPriority[props.priority];
    }

    const origColor = getColor(colorNameByPriority[props.priority]);
    return origColor;
  };

  return {
    backgroundColor: getBgColor(),
    left: props.left,
    height: props.height,
    isInPast: props.isInPast,
    hoverColor: props.isPlaceholder
      ? null
      : hoverColorsByPriority[props.priority],
    opacity: props.isPlaceholder ? 0.5 : null,
    pastDimness,
    ref: props.ref,
    top: props.top,
    width: props.width,
  };
})<StyledEventProps>`
  background-color: ${(props) => props.backgroundColor};
  border-radius: 2px;
  ${(props) => props.isDragging && `cursor: grabbing`}
  filter: brightness(
    ${({ isInPast }) => (isInPast ? pastDimness : null)}
  );
  height: ${({ height }) => height}px;
  left: ${(props) => props.left}px;
  opacity: ${(props) => props.opacity};
  overflow: hidden;
  padding: 1px;
  position: absolute;
  /* text-rendering: geometricPrecision; */
  top: ${(props) => props.top}px;

  user-select: none;
  /* white-space: pre-line; */
  width: ${(props) => props.width}px;
  z-index: ${ZIndex.LAYER_1};

  &:hover {
    background-color: ${(props) => props.hoverColor};
    cursor: default;
    filter: brightness(
        ${({ isPlaceholder }) => (isPlaceholder ? pastDimness : null)}
      )
      ${({ isPlaceholder }) =>
        !isPlaceholder && `drop-shadow(2px 4px 4px black)`};
    transition: background-color 0.35s linear;
  }

  &.active {
    background-color: ${(props) => props.hoverColor};
    filter: ${({ isPlaceholder }) =>
      isPlaceholder ? null : "drop-shadow(2px 4px 4px black)"};
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
  bottom?: string;
  isDragging: boolean;
  top?: string;
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
  ${(props) => !props.isDragging && `cursor: ns-resize`};
`;
