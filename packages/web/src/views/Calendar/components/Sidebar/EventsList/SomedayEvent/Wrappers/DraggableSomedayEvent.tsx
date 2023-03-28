import React, { FC } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Schema_Event } from "@core/types/event.types";
import { SomedayEventsProps } from "@web/views/Calendar/hooks/draft/useSidebarDraft";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";

import { SomedayEvent } from "../SomedayEvent";

export interface Props {
  draftId: string;
  event: Schema_Event;
  index: number;
  isDrafting: boolean;
  isOverGrid: boolean;
  util: SomedayEventsProps["util"];
}

export const DraggableSomedayEvent: FC<Props> = ({
  draftId,
  event,
  isDrafting,
  isOverGrid,
  index,
  util,
}) => {
  const isDraftingThisEvent =
    (isDrafting && draftId === event._id) || draftId === ID_SOMEDAY_DRAFT;

  return (
    <div>
      <Draggable
        draggableId={event?._id || draftId}
        index={index}
        key={event?._id || draftId}
        isDragDisabled={draftId === ID_SOMEDAY_DRAFT}
      >
        {(provided, snapshot) => {
          return (
            <>
              <SomedayEvent
                //++ need to pass the draft if needed
                event={event}
                //++ isDragging={isDragging || snapshot.isDragging}
                isDragging={snapshot.isDragging}
                isDrafting={isDraftingThisEvent}
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

//++
// <div ref={drag}>
// const [{ isDragging }, drag, preview] = useDrag(
//   () => ({
//     type: Category_DragItem.EVENT_SOMEDAY,
//     // only includes props that a user could change
//     // while drafting
//     item: () => {
//       return {
//         _id: event._id,
//         description: event.description,
//         priority: event.priority,
//         order: event.order,
//         title: event.title,
//       };
//     },
//     collect: (monitor) => ({
//       isDragging: monitor.isDragging(),
//     }),
//   }),
//   [event._id, event.description, event.priority, event.order, event.title]
// );

// useEffect(() => {
//   preview(getEmptyImage(), { captureDraggingState: true });
// }, [preview]);
