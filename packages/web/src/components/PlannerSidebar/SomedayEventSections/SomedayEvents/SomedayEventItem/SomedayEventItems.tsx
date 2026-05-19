import { type FC, memo } from "react";
import { type Schema_Event } from "@core/types/event.types";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";
import { type SomedayInteractionCategory } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { SomedayEventItem } from "./SomedayEventItem";

const _SomedayEventItems: FC<{
  category: SomedayInteractionCategory;
  draft: Schema_Event | null;
  events: Schema_Event[];
}> = ({ category, draft, events }) => {
  return (
    <>
      {events.map((event, index: number) => {
        const isDrafting = draft?._id === event._id;

        return (
          <SomedayEventItem
            category={category}
            draftId={draft?._id || ID_SOMEDAY_DRAFT}
            event={event}
            index={index}
            isDrafting={isDrafting}
            key={event?._id || "draft"}
          />
        );
      })}
    </>
  );
};

export const SomedayEventItems = memo(_SomedayEventItems);

SomedayEventItems.displayName = "SomedayEventItems";
