import React, { memo, useEffect } from "react";
import type { CSSProperties, FC } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Schema_Event } from "@core/types/event.types";
import { DragItem, DropResult } from "@web/common/types/dnd.types";

import { SomedayEvent } from "./SomedayEvent";

// $$ remove if unneeded
function getStyles(
  left: number,
  top: number,
  isDragging: boolean
): CSSProperties {
  const transform = `translate3d(${left}px, ${top}px, 0)`;
  return {
    position: "absolute",
    transform,
    WebkitTransform: transform,
    // IE fallback: hide the real node using CSS when dragging
    // because IE will ignore our custom "empty image" drag preview.
    // opacity: isDragging ? 0 : 1,
    height: isDragging ? 0 : "",
  };
}

export interface DraggableBoxProps {
  id: string;
  title: string;
  left: number;
  top: number;
  event: Schema_Event;
}
const left = 10;
const top = 10;

export const DraggableSomedayEvent: FC<DraggableBoxProps> = memo(
  function DraggableSomedayEvent({ event }) {
    const [{ isDragging }, drag, preview] = useDrag(
      () => ({
        type: DragItem.EVENT_SOMEDAY,
        // only use props needed for drag & drop
        item: { _id: event._id, title: event.title, priority: event.priority },
        end: (item, monitor) => {
          const dropResult = monitor.getDropResult<DropResult>();
          if (item && dropResult) {
            console.log("you dropped:", item);
          }
        },
        collect: (monitor) => ({
          isDragging: monitor.isDragging(),
        }),
      }),
      [event._id, left, top]
    );

    useEffect(() => {
      preview(getEmptyImage(), { captureDraggingState: true });
    }, []);

    return (
      <div
        ref={drag}
        // style={getStyles(left, top, isDragging)}
      >
        <SomedayEvent event={event} isDragging={isDragging} />
      </div>
    );
  }
);
