import React, { FC, memo } from "react";
import { useDragLayer } from "react-dnd";
import { DragItem, DropResult } from "@web/common/types/dnd.types";
import { WeekViewProps } from "@web/views/Calendar/weekViewHooks/useGetWeekViewProps";

import { DraggableEvent } from "./DraggableEvent";
import { getItemStyles, layerStyles } from "./styled";

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
