import type { CSSProperties } from "react";
import type { XYCoord } from "react-dnd";
import styled from "styled-components";
import { Priority } from "@core/constants/core.constants";
import { ZIndex } from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";
import { hoverColorByPriority } from "@web/common/styles/theme.util";

export const getItemStyles = (currentOffset: XYCoord | null) => {
  if (!currentOffset) {
    return {
      display: "none",
    };
  }

  const { x, y } = currentOffset;

  const transform = `translate(${x}px, ${y}px)`;

  return {
    transform,
    WebkitTransform: transform,
  };
};

export const layerStyles: CSSProperties = {
  position: "fixed",
  pointerEvents: "none",
  zIndex: ZIndex.MAX,
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
};

interface StyledEventProps {
  backgroundColor?: string;
  duration: number;
  height: number;
  priority: Priority;
  width: number;
}

export const StyledGridEventPreview = styled.div.attrs<StyledEventProps>(
  (props) => {
    return {
      backgroundColor: hoverColorByPriority[props.priority],
      color: theme.color.text.dark,
      height: props.height,
      hoverColor: hoverColorByPriority[props.priority],
      width: props.width,
    };
  },
)<StyledEventProps>`
  background-color: ${(props) => props.backgroundColor};
  color: ${(props) => props.color};
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  box-shadow: 0 0 0 0 transparent;
  height: ${({ height }) => height}px;
  position: absolute;
  transition:
    background-color 0.2s,
    box-shadow 0.2s;
  user-select: none;
  width: ${(props) => props.width}px;

  &:hover,
  &.active {
    filter: drop-shadow(2px 4px 4px black);
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
