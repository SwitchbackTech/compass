import React, { FC, memo, useEffect } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Schema_Event } from "@core/types/event.types";
import { DragItem } from "@web/common/types/dnd.types";

import { SomedayEvent } from "./SomedayEvent";

// $$ remove title and id if you don't need
export interface Props {
  id: string;
  title: string;
  event: Schema_Event;
}

export const DraggableSomedayEvent: FC<Props> = memo(
  function DraggableSomedayEvent({ event }) {
    const [{ isDragging }, drag, preview] = useDrag(
      () => ({
        type: DragItem.EVENT_SOMEDAY,
        // only include props needed for drag & drop
        item: { _id: event._id, title: event.title, priority: event.priority },

        collect: (monitor) => ({
          isDragging: monitor.isDragging(),
        }),
      }),
      [event._id]
    );

    useEffect(() => {
      preview(getEmptyImage(), { captureDraggingState: true });
    }, [preview]);

    return (
      <div ref={drag}>
        <SomedayEvent event={event} isDragging={isDragging} />
      </div>
    );
  }
);
