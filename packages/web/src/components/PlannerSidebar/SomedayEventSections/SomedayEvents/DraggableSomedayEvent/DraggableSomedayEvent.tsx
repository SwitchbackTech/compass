import { Draggable } from "@hello-pangea/dnd";
import { type FC } from "react";
import {
  type Categories_Event,
  type Schema_Event,
} from "@core/types/event.types";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { selectDatesInView } from "@web/ducks/events/selectors/view.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { SomedayEventContainer } from "../SomedayEventContainer/SomedayEventContainer";

export interface Props {
  category: Categories_Event;
  draftId: string;
  event: Schema_Event;
  index: number;
  isDrafting: boolean;
  isOverGrid: boolean;
}

export const DraggableSomedayEvent: FC<Props> = ({
  category,
  draftId,
  event,
  isDrafting,
  isOverGrid,
  index,
}) => {
  const isDraftingThisEvent =
    isDrafting && (draftId === event._id || !event._id);
  const { actions, setters } = useSidebarContext();
  const { start, end } = useAppSelector(selectDatesInView);

  return (
    <div>
      <Draggable
        draggableId={event?._id || draftId}
        index={index}
        key={event?._id || draftId}
        isDragDisabled={event?._id === undefined}
      >
        {(provided, snapshot) => {
          return (
            <SomedayEventContainer
              category={category}
              event={event}
              isDragging={snapshot.isDragging}
              isDrafting={isDraftingThisEvent}
              isOverGrid={isOverGrid}
              duplicateEvent={actions.duplicateSomedayEvent}
              deleteEvent={actions.deleteSomedayEvent}
              onSubmit={(event) => actions.onSubmit(category, event)}
              provided={provided}
              snapshot={snapshot}
              setEvent={setters.setDraft}
              weekViewRange={{ startDate: start, endDate: end }}
            />
          );
        }}
      </Draggable>
    </div>
  );
};
