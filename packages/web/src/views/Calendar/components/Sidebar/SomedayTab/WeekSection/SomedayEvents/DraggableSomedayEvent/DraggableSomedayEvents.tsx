import React, { FC, memo } from "react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";
import { DraggableSomedayEvent } from "./DraggableSomedayEvent";

const _DraggableSomedayEvents: FC<{
  category: Categories_Event;
  draft: Schema_Event | null;
  events: Schema_Event[];
  isOverGrid: boolean;
}> = ({ category, draft, events, isOverGrid }) => {
  // console.log("draftId:", draft?._id);
  return (
    <>
      {events.map((event, index: number) => {
        const isDrafting =
          draft?._id === event._id || draft?._id === ID_SOMEDAY_DRAFT;
        if (isDrafting) {
          const isDraftIdMatch = draft?._id === event._id;
          if (isDraftIdMatch) {
            console.log("drafting cuz ids match for:", event?.title);
          } else {
            console.log("drafting cuz draftId is ID_SOMEDAY_DRAFT");
          }
        }

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
