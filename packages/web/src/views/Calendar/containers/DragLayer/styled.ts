import styled from "styled-components";
import type { CSSProperties } from "react";
import { Priority } from "@core/core.constants";
import { hoverColorsByPriority } from "@web/common/utils/colors";
import { ZIndex } from "@web/common/constants/web.constants";

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

export const StyledDraggableEvent = styled.div.attrs<StyledEventProps>(
  (props) => {
    return {
      backgroundColor: hoverColorsByPriority[props.priority],
      height: props.height,
      hoverColor: hoverColorsByPriority[props.priority],
      width: props.width,
    };
  }
)<StyledEventProps>`
  border-radius: 3px;
  position: absolute;
  width: ${(props) => props.width}px;
  height: ${({ height }) => height}px;
  background-color: ${(props) => props.backgroundColor};
  user-select: none;
  transition: background-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 0 0 transparent;
  /* cursor: "grabbing"; */

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
