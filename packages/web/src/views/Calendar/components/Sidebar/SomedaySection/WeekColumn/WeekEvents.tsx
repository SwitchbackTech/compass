import React, { FC, memo } from "react";

import { DraggableSomedayEvent } from "../../EventsList/SomedayEvent/Wrappers/DraggableSomedayEvent";
import { SomedayEventsProps } from "../../../../hooks/draft/useSidebarDraft";
import { WeekColProps } from "./weekColumn.types";

export const WeekEvents: FC<{
  events: WeekColProps["events"];
  draftId: string;
  isDrafting: boolean;
  isOverGrid: boolean;
  util: SomedayEventsProps["util"];
}> = memo(({ draftId, events, isDrafting, isOverGrid, util }) => {
  return (
    <>
      {events.map((event, index: number) => (
        <DraggableSomedayEvent
          draftId={draftId}
          event={event}
          index={index}
          isDrafting={isDrafting}
          isOverGrid={isOverGrid}
          key={event?._id || "draft"}
          util={util}
        />
      ))}
    </>
  );
});
