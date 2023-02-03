import React, { Dispatch, FC, SetStateAction, useEffect } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { Schema_Event } from "@core/types/event.types";
import { DragItem } from "@web/common/types/dnd.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

import { SomedayEvent } from "./SomedayEvent";

export interface Props {
  id: string;
  isDrafting: boolean;
  event: Schema_Event;
  onClose: () => void;
  onDraft: (event: Schema_Event) => void;
  onMigrate: (event: Schema_Event, location: "forward" | "back") => void;
  onSubmit: () => void;
  setEvent: Dispatch<SetStateAction<Schema_GridEvent>>;
}

// export const DraggableSomedayEvent: FC<Props> = memo(
export const DraggableSomedayEvent: FC<Props> = ({
  event,
  isDrafting,
  onClose,
  onDraft,
  onMigrate,
  onSubmit,
  setEvent,
}) => {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: DragItem.EVENT_SOMEDAY,
      // only includes props that a user could change
      // while drafting
      item: {
        _id: event._id,
        description: event.description,
        title: event.title,
        priority: event.priority,
      },

      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [event._id, event.description, event.title, event.priority]
  );

  useEffect(() => {
    // preview(getEmptyImage(), { captureDraggingState: true });
    preview(getEmptyImage());
  }, [preview]);

  return (
    <div ref={drag}>
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
// );
