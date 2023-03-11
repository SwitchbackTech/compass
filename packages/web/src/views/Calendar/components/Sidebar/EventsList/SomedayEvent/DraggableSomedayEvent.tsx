import React, { Dispatch, FC, SetStateAction, useEffect, useRef } from "react";
import type { Identifier, XYCoord } from "dnd-core";
import { useDrag, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Schema_Event } from "@core/types/event.types";
import {
  Category_DragItem,
  DragItem_Someday,
} from "@web/common/types/dnd.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

import { SomedayEvent } from "./SomedayEvent";

export interface Props {
  event: Schema_Event;
  id: string;
  isDrafting: boolean;
  onClose: () => void;
  onDraft: (event: Schema_Event) => void;
  onMigrate: (event: Schema_Event, location: "forward" | "back") => void;
  onSubmit: () => void;
  setEvent: Dispatch<SetStateAction<Schema_GridEvent>>;
}

export const DraggableSomedayEvent: FC<Props> = ({
  event,
  isDrafting,
  onClose,
  onDraft,
  onMigrate,
  onSubmit,
  setEvent,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<
    DragItem_Someday,
    void,
    { handlerId: Identifier | null }
  >({
    accept: Category_DragItem.EVENT_SOMEDAY,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    /*
    hover(item: DragItem_Someday, monitor) {
      if (!ref.current) {
        return;
      }

      // const dragIndex = item.order;
      // const hoverIndex = event.order;
      const origOrder = event.order;
      const newOrder = item.order;
      if (origOrder === undefined) {
        alert("its undefined"); //++
      }

      if (newOrder === origOrder) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const { y } = monitor.getClientOffset();

      // Get pixels to the top
      //++ convert this to use the hover width of draft row
      const hoverClientY = y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (newOrder < origOrder && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (newOrder > origOrder && hoverClientY > hoverMiddleY) {
        return;
      }

      reorder(item.title, origOrder, newOrder);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.

      // item.order = origOrder;
      item.order = newOrder;

      // monitor.getItem().index = hoverIndex;
    },
    */
  });

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: Category_DragItem.EVENT_SOMEDAY,
      // only includes props that a user could change
      // while drafting
      item: () => {
        return {
          _id: event._id,
          description: event.description,
          priority: event.priority,
          order: event.order,
          title: event.title,
        };
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [event._id, event.description, event.priority, event.order, event.title]
  );

  useEffect(() => {
    // preview(getEmptyImage(), { captureDraggingState: true });
    preview(getEmptyImage());
  }, [preview]);

  drag(drop(ref));

  return (
    <div ref={ref}>
      <SomedayEvent
        event={event}
        isDrafting={isDrafting}
        isDragging={isDragging}
        onClose={onClose}
        onDraft={onDraft}
        onMigrate={onMigrate}
        onSubmit={onSubmit}
        setEvent={setEvent}
      />
    </div>
  );
};
