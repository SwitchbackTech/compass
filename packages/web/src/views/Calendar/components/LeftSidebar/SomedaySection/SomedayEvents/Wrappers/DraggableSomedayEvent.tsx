import React, { FC } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Schema_Event } from "@core/types/event.types";
import { SomedayEventsProps } from "@web/views/Calendar/hooks/draft/sidebar/useSidebar";
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
                event={event}
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
