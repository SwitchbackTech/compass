import React from "react";
import type { CSSProperties, FC } from "react";
import type { XYCoord } from "react-dnd";
import { useDragLayer } from "react-dnd";
import { DragItem } from "@web/common/types/dnd.types";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";
import { ZIndex } from "@web/common/constants/web.constants";
import { roundByNumber } from "@web/common/utils";

import { DraggableEvent } from "./DraggableEvent";
import { GRID_TIME_STEP } from "../../constants"; //$$

const layerStyles: CSSProperties = {
  position: "fixed",
  pointerEvents: "none",
  zIndex: ZIndex.MAX,
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
};

const snapToGrid = (x: number, y: number): [number, number] => {
  /* attempt at accurate version
  const height = 60.8;
  const minOnGrid = (y / height) * 60;
  const min = roundByNumber(minOnGrid - GRID_TIME_STEP / 2, GRID_TIME_STEP);
  const snappedY = min; */

  /* good enough version */
  const yInterval = 10; // good enough for now, but won't be perfect
  const snappedY = Math.round(y / yInterval) * yInterval;
  const snappedX = x;
  //   console.log(`origY: ${y}, snappedY: ${snappedY}`);

  return [snappedX, snappedY];
};

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

  //$$
  const shouldSnapToGrid = true;
  if (shouldSnapToGrid) {
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
      <div style={getItemStyles(initialOffset, currentOffset)}>
        {renderItem()}
      </div>
    </div>
  );
};
