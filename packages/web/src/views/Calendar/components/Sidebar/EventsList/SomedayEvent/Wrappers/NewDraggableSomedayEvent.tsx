import React, { FC, useEffect } from "react";
import { Schema_Event } from "@core/types/event.types";
import { Category_DragItem } from "@web/common/types/dnd.types";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Draggable } from "@hello-pangea/dnd";

import { SomedayEventsProps } from "../../../SomedaySection/hooks/useSomedayEvents";
import { SomedayEventRectangle } from "../SomedayEventRectangle";
import { NewStyledSomedayEvent } from "../newStyled";
import { NewSomedayEvent } from "../NewSomedayEvent";

export interface Props {
  draftId: string;
  event: Schema_Event;
  index: number;
  isOverGrid: boolean;
  util: SomedayEventsProps["util"];
}

export const NewDraggableSomedayEvent: FC<Props> = ({
  draftId,
  event,
  isOverGrid,
  index,
  util,
}) => {
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
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  // if (isOverGrid) {
  //   console.log("returning null");
  //   return null;
  // }

  return (
    <div ref={drag}>
      <Draggable
        // draggableId={event._id || draftId}
        draggableId={event._id}
        index={index}
        isDragDisabled={isOverGrid}
        key={event._id}
      >
        {(provided, snapshot) => {
          return (
            <>
              <NewSomedayEvent
                event={event}
                isDragging={isDragging || snapshot.isDragging}
                isDrafting={false}
                isOverGrid={isOverGrid}
                onClose={util.close}
                onDraft={util.onDraft}
                onMigrate={util.onMigrate}
                onSubmit={util.onSubmit}
                provided={provided}
                setEvent={util.setDraft}
              />
            </>
          );
        }}
      </Draggable>
    </div>
  );
};
