import styled from "styled-components";
import { DraggableStateSnapshot, DroppableProvided } from "@hello-pangea/dnd";
import { DraggableStyle } from "@hello-pangea/dnd";
import { Priorities } from "@core/constants/core.constants";
import { brighten } from "@core/util/color.utils";
import {
  colorByPriority,
  hoverColorByPriority,
} from "@web/common/styles/theme.util";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";

export function getStyle(
  snapshot: DraggableStateSnapshot,
  isOverGrid: boolean,
  style?: DraggableStyle,
) {
  if (!snapshot.isDropAnimating) {
    return style;
  }

  const disableDropAnimationStyles = {
    ...style,
    // cannot be 0, but make it super tiny. See https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/guides/drop-animation.md#skipping-the-drop-animation
    transitionDuration: `0.001s`,
  };

  // Drop animation adds delay to the `onDragEnd` event, causes bad UX when
  // dragging events to the grid. Disable drop animation when dragging events
  // to the grid.
  if (isOverGrid) {
    return disableDropAnimationStyles;
  }

  return style;
}

export const SOMEDAY_EVENT_HEIGHT = 32;

export interface Props extends DroppableProvided {
  priority: Priorities;
  isDrafting: boolean;
  isDragging?: boolean;
  isOverGrid: boolean;
  isFocused: boolean;
}

export const StyledNewSomedayEvent = styled.div<Props>`
  background: ${({ isDrafting, isDragging, priority }) => {
    if (isDrafting) {
      if (isDragging) {
        return brighten(colorByPriority[priority]);
      }
      return hoverColorByPriority[priority];
    }

    return colorByPriority[priority];
  }};

  border-radius: 2px;
  color: ${({ theme }) => theme.color.text.dark};
  height: ${SOMEDAY_EVENT_HEIGHT}px;
  filter: brightness(
    ${({ isDragging, isFocused }) =>
      isFocused && !isDragging ? "160%" : "100%"}
  );
  margin-bottom: 2px;
  opacity: ${({ isDragging, isOverGrid }) => {
    if (isDragging && isOverGrid) return 0;
    return 1;
  }};
  padding: 5px;
  transition:
    background-color 0.2s,
    box-shadow 0.2s;
  width: calc(${SIDEBAR_OPEN_WIDTH}-5) px;

  &:hover {
    background: ${({ priority }) => hoverColorByPriority[priority]};
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
