import styled from "styled-components";
import type { XYCoord } from "react-dnd";
import type { CSSProperties } from "react";
import { Priority } from "@core/constants/core.constants";
import {
  getInvertedColor,
  hoverColorsByPriority,
} from "@core/util/color.utils";
import { ZIndex } from "@web/common/constants/web.constants";
import { colorNameByPriority } from "@core/constants/colors";
import { InvertedColorNames } from "@core/types/color.types";

import { snapToGrid } from "./snap.grid";

export const getItemStyles = (
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null
) => {
  if (!initialOffset || !currentOffset) {
    return {
      display: "none",
    };
  }

  let { x, y } = currentOffset;

  // snap logic
  x -= initialOffset.x;
  y -= initialOffset.y;
  [x, y] = snapToGrid(x, y);
  x += initialOffset.x;
  y += initialOffset.y;

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
      backgroundColor: hoverColorsByPriority[props.priority],
      color: getInvertedColor(
        colorNameByPriority[props.priority] as unknown as InvertedColorNames
      ),
      height: props.height,
      hoverColor: hoverColorsByPriority[props.priority],
      width: props.width,
    };
  }
)<StyledEventProps>`
  background-color: ${(props) => props.backgroundColor};
  color: ${(props) => props.color};
  border-radius: 3px;
  box-shadow: 0 0 0 0 transparent;
  height: ${({ height }) => height}px;
  position: absolute;
  transition: background-color 0.2s, box-shadow 0.2s;
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
