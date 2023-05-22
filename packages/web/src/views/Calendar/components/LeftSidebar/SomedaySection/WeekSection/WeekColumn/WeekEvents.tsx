import React, { FC, memo } from "react";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { SomedayEventsProps } from "@web/views/Calendar/hooks/draft/sidebar/useSidebar";

import { DraggableSomedayEvent } from "../../../EventsList/SomedayEvent/Wrappers/DraggableSomedayEvent";
import { WeekColProps } from "./weekColumn.types";

export const WeekEvents: FC<{
  events: WeekColProps["events"];
  draft: Schema_GridEvent;
  isDrafting: boolean;
  isOverGrid: boolean;
  util: SomedayEventsProps["util"];
}> = memo(({ draft, events, isDrafting, isOverGrid, util }) => {
  return (
    <>
      {events.map((event, index: number) => {
        const isDraftingThisEvent =
          (isDrafting && draft?._id === event._id) ||
          draft?._id === ID_SOMEDAY_DRAFT;

        return (
          <DraggableSomedayEvent
            draftId={draft?._id}
            event={isDraftingThisEvent ? draft : event}
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
