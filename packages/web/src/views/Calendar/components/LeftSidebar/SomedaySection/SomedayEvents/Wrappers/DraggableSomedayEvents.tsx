import React, { FC, memo } from "react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { SomedayEventsProps } from "@web/views/Calendar/hooks/draft/sidebar/useSidebar";

import { DraggableSomedayEvent } from "./DraggableSomedayEvent";

export const DraggableSomedayEvents: FC<{
  category: Categories_Event;
  events: Schema_Event[];
  draft: Schema_GridEvent;
  isOverGrid: boolean;
  util: SomedayEventsProps["util"];
}> = memo(({ category, draft, events, isOverGrid, util }) => {
  return (
    <>
      {events.map((event, index: number) => {
        const isDrafting =
          draft?._id === event._id || draft?._id === ID_SOMEDAY_DRAFT;

        return (
          <DraggableSomedayEvent
            category={category}
            draftId={draft?._id}
            event={isDrafting ? draft : event}
            index={index}
            isDrafting={isDrafting}
            isOverGrid={isOverGrid}
            key={event?._id || "draft"}
            util={util}
          />
        );
      })}
    </>
  );
});
