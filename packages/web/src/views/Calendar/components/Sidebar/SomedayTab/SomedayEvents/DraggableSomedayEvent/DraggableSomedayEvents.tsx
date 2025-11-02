import React, { FC, memo } from "react";
import { Schema_Event } from "@core/types/event.types";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";
import { Categories_Event } from "@web/common/types/web.event.types";
import { DraggableSomedayEvent } from "./DraggableSomedayEvent";

const _DraggableSomedayEvents: FC<{
  category: Categories_Event;
  draft: Schema_Event | null;
  events: Schema_Event[];
  isOverGrid: boolean;
}> = ({ category, draft, events, isOverGrid }) => {
  return (
    <>
      {events.map((event, index: number) => {
        const isDrafting = draft?._id === event._id;

        return (
          <DraggableSomedayEvent
            category={category}
            draftId={draft?._id || ID_SOMEDAY_DRAFT}
            event={isDrafting && draft ? draft : event}
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
