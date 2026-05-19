import { type FC } from "react";
import { type Schema_Event } from "@core/types/event.types";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import {
  getSomedayInteractionEventAttributes,
  type SomedayInteractionCategory,
  useSomedayEventRegistrationRef,
} from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { selectDatesInView } from "@web/ducks/events/selectors/view.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { SomedayEventContainer } from "../SomedayEventContainer/SomedayEventContainer";

export interface Props {
  category: SomedayInteractionCategory;
  draftId: string;
  event: Schema_Event;
  index: number;
  isDrafting: boolean;
}

export const SomedayEventItem: FC<Props> = ({
  category,
  draftId,
  event,
  isDrafting,
  index,
}) => {
  const isDraftingThisEvent =
    isDrafting && (draftId === event._id || !event._id);
  const { actions, setters, state } = useSidebarContext();
  const { start, end } = useAppSelector(selectDatesInView);
  const isDraggingThisEvent =
    state.isDragging && state.draft?._id === event._id;
  const interactionRef = useSomedayEventRegistrationRef({
    category,
    eventId: event._id,
    index,
    isEnabled: Boolean(event._id),
  });
  const interactionAttributes = getSomedayInteractionEventAttributes({
    category,
    eventId: event._id,
  });

  return (
    <div>
      <SomedayEventContainer
        category={category}
        event={event}
        interactionAttributes={interactionAttributes}
        interactionRef={interactionRef}
        isDragging={isDraggingThisEvent}
        isDrafting={isDraftingThisEvent}
        duplicateEvent={actions.duplicateSomedayEvent}
        deleteEvent={actions.deleteSomedayEvent}
        onSubmit={(event) => actions.onSubmit(category, event)}
        setEvent={setters.setDraft}
        weekViewRange={{ startDate: start, endDate: end }}
      />
    </div>
  );
};
