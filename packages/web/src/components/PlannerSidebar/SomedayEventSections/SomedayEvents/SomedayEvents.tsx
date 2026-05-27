import { type FC } from "react";
import { type Schema_Event } from "@core/types/event.types";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { type SomedayInteractionCategory } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { SomedayEventsContainer } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEventsContainer/SomedayEventsContainer";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";

interface Props {
  category: SomedayInteractionCategory;
  events: Schema_Event[];
}
export const SomedayEvents: FC<Props> = ({ category, events }) => {
  const { state } = useSidebarContext();
  const draftCategory = useAppSelector(selectDraftCategory);

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
