import React, { FC, memo } from "react";
import { useDragLayer } from "react-dnd";
import { DragItem, DropResult } from "@web/common/types/dnd.types";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

import { DraggableEvent } from "./DraggableEvent";
import { getItemStyles, layerStyles } from "./styled";
import { WeekProps } from "../../hooks/useWeek";

export interface Props {
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfSelectedWeekDay"];
}

// export const DragLayer: FC<Props> = ({
export const DragLayer: FC<Props> = memo(function DragLayer({
  dateCalcs,
  measurements,
  viewStart,
}) {
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
            dateCalcs={dateCalcs}
            event={item}
            measurements={measurements}
            startOfView={viewStart}
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
  // };
});
