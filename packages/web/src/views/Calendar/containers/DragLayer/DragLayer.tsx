import React, { FC, memo } from "react";
import type { XYCoord } from "react-dnd";
import { useDragLayer } from "react-dnd";
import { DragItem, DropResult } from "@web/common/types/dnd.types";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";

import { DraggableEvent } from "./DraggableEvent";
import { layerStyles } from "./styled";
import { snapToGrid } from "./snap.grid";

function getItemStyles(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null
) {
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
}

export interface Props {
  snapToGrid?: boolean;
  weekViewProps: WeekViewProps;
}

export const DragLayer: FC<Props> = memo(function DragLayer({ weekViewProps }) {
  const { itemType, item, currentOffset, initialOffset } = useDragLayer(
    (monitor) => ({
      item: monitor.getItem<DropResult>(),
      itemType: monitor.getItemType(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      isDragging: monitor.isDragging(),
      currentOffset: monitor.getClientOffset(),
    })
  );

  function renderItem() {
    switch (itemType) {
      case DragItem.EVENT_SOMEDAY:
        return (
          <DraggableEvent
            coordinates={currentOffset}
            event={item}
            weekViewProps={weekViewProps}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(initialOffset, currentOffset)}>
        {renderItem()}
      </div>
    </div>
  );
});
