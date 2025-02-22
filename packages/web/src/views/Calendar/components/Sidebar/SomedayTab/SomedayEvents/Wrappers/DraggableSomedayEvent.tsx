import React, { FC } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import { SomedayEvent } from "../SomedayEvent";

export interface Props {
  category: Categories_Event;
  draftId: string;
  event: Schema_Event;
  index: number;
  isDrafting: boolean;
  isOverGrid: boolean;
}

export const DraggableSomedayEvent: FC<Props> = ({
  category,
  draftId,
  event,
  isDrafting,
  isOverGrid,
  index,
}) => {
  const isDraftingThisEvent = isDrafting && draftId === event._id;
  const { actions, setters } = useSidebarContext();

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
                category={category}
                event={event}
                isDragging={snapshot.isDragging}
                isDrafting={isDraftingThisEvent}
                isOverGrid={isOverGrid}
                onClose={actions.close}
                onDraft={() => actions.onDraft(event, category)}
                onMigrate={actions.onMigrate}
                onSubmit={() => actions.onSubmit(category)}
                provided={provided}
                snapshot={snapshot}
                setEvent={setters.setDraft}
              />
            </>
          );
        }}
      </Draggable>
    </div>
  );
};
