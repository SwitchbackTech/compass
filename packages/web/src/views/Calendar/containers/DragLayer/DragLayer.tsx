import React from "react";
import type { CSSProperties, FC } from "react";
import type { XYCoord } from "react-dnd";
import { useDragLayer } from "react-dnd";
import { DragItem } from "@web/common/types/dnd.types";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { ZIndex } from "@web/common/constants/web.constants";

import { DraggableEvent } from "./DraggableEvent";

const layerStyles: CSSProperties = {
  position: "fixed",
  pointerEvents: "none",
  zIndex: ZIndex.MAX,
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
};

function getItemStyles(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null,
  isSnapToGrid: boolean
) {
  if (!initialOffset || !currentOffset) {
    return {
      display: "none",
    };
  }

  let { x, y } = currentOffset;

  //$$
  if (isSnapToGrid) {
    x -= initialOffset.x;
    y -= initialOffset.y;
    [x, y] = snapToGrid(x, y);
    x += initialOffset.x;
    y += initialOffset.y;
  }

  const transform = `translate(${x}px, ${y}px)`;
  return {
    transform,
    WebkitTransform: transform,
  };
}

export interface CustomDragLayerProps {
  snapToGrid?: boolean;
  weekViewProps: WeekViewProps;
}

export const DragLayer: FC<CustomDragLayerProps> = ({ weekViewProps }) => {
  const { itemType, isDragging, item, currentOffset, initialOffset } =
    useDragLayer((monitor) => ({
      item: monitor.getItem(),
      itemType: monitor.getItemType(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      isDragging: monitor.isDragging(),
      currentOffset: monitor.getSourceClientOffset(),
    }));

  const tempEvt = {
    title: "foo",
    priority: "work",
  };

  function renderItem() {
    switch (itemType) {
      case DragItem.EVENT_SOMEDAY:
        return (
          <DraggableEvent
            coordinates={currentOffset}
            event={tempEvt}
            weekViewProps={weekViewProps}
          />
        );
      // return <DragPreview />; //$$
      default:
        return null;
    }
  }

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(initialOffset, currentOffset, false)}>
        {renderItem()}
      </div>
    </div>
  );
};
