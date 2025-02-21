import React, { FC, memo } from "react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";

import { DraggableSomedayEvent } from "./DraggableSomedayEvent";

const _DraggableSomedayEvents: FC<{
  category: Categories_Event;
  events: Schema_Event[];
  draft: Schema_Event;
  isOverGrid: boolean;
}> = ({ category, draft, events, isOverGrid }) => {
  return (
    <>
      {events.map((event, index: number) => {
        const isDrafting =
          draft?._id === event._id || draft?._id === ID_SOMEDAY_DRAFT;

        return (
          <DraggableSomedayEvent
            category={category}
            draftId={draft?._id || ID_SOMEDAY_DRAFT}
            event={isDrafting ? draft : event}
            index={index}
            isDrafting={isDrafting}
            isOverGrid={isOverGrid}
            key={event?._id || "draft"}
          />
        );
      })}
    </>
  );
};

export const DraggableSomedayEvents = memo(_DraggableSomedayEvents);
