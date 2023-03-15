import React, { FC, useEffect } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Schema_Event } from "@core/types/event.types";
import { Category_DragItem } from "@web/common/types/dnd.types";
import { ID_NEW_DRAFT } from "@web/common/constants/web.constants";

import { SomedayEvent } from "../SomedayEvent";
import { SomedayEventsProps } from "../../../SomedaySection/hooks/useSomedayEvents";

export interface Props {
  draftId: string;
  event: Schema_Event;
  index: number;
  util: SomedayEventsProps["util"];
}

export const DraggableSomedayEvent: FC<Props> = ({
  draftId,
  event,
  index,
  util,
}) => {
  /*
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
  */

  return (
    <div
      onClick={(e) => {
        console.log("mouseup");
        e.stopPropagation();
        e.preventDefault();
      }}
      // ref={drag}
    >
      <Draggable
        draggableId={event._id || draftId}
        index={index}
        key={event._id}
      >
        {(provided, snapshot) => {
          return (
            <SomedayEvent
              // isDragging={snapshot.isDragging || isDragging}
              isDragging={snapshot.isDragging}
              isSorting={
                snapshot.isDragging && snapshot.draggingOver === "column-1"
              }
              event={event}
              isDrafting={draftId === ID_NEW_DRAFT || draftId === event._id}
              onClose={util.close}
              onDraft={util.onDraft}
              onMigrate={util.onMigrate}
              onSubmit={util.onSubmit}
              provided={provided}
              setEvent={util.setDraft}
            />
          );
        }}
      </Draggable>
    </div>
  );
};
