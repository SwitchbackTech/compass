import { type FC } from "react";
import { type Event } from "@core/types/event.contracts";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { type SomedayInteractionCategory } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { SomedayEventsContainer } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventsContainer/SomedayEventsContainer";
import {
  selectDraftCategory,
  useDraftStore,
} from "@web/events/stores/draft.store";

interface Props {
  category: SomedayInteractionCategory;
  events: Event[];
}
export const SomedayEvents: FC<Props> = ({ category, events }) => {
  const { state } = useSidebarContext();
  const draftCategory = useDraftStore(selectDraftCategory);

  const isDraftingNew = state.isDraftingNew && draftCategory === category;

  return (
    <div
      className={
        state.isDragging ? "w-full overflow-hidden" : "w-full overflow-auto"
      }
    >
      <div key={`${category}-wrapper`}>
        <SomedayEventsContainer
          category={category}
          events={events}
          isDraftingNew={isDraftingNew}
        />
      </div>
    </div>
  );
};
