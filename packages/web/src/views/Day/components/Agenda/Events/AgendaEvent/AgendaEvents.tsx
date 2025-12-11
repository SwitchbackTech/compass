import classNames from "classnames";
import { useState } from "react";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { useGridOrganization } from "@web/common/hooks/useGridOrganization";
import { Droppable } from "@web/components/DND/Droppable";
import {
  selectIsDayEventsProcessing,
  selectTimedDayEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
import { AgendaSkeleton } from "@web/views/Day/components/Agenda/AgendaSkeleton/AgendaSkeleton";
import { DraggableAgendaEvent } from "@web/views/Day/components/Agenda/Events/AgendaEvent/DraggableAgendaEvent";

export const AgendaEvents = ({ height }: { height?: number }) => {
  const events = useAppSelector(selectTimedDayEvents);
  const isLoading = useAppSelector(selectIsDayEventsProcessing);
  const { openEventForm } = useDraftContextV2();
  const [ref, setRef] = useState<HTMLElement | null>(null);

  useGridOrganization(ref);

  return (
    <Droppable
      as="div"
      dndProps={{ id: ID_GRID_MAIN }}
      ref={setRef}
      id={ID_GRID_MAIN}
      data-testid="timed-agendas"
      className={classNames(
        "relative ml-1 flex-1 cursor-cell overflow-hidden",
        { isOver: "bg-gray-400/20" },
      )}
      style={{ height }}
      onClick={() => openEventForm()}
    >
      {/* Event blocks */}
      {isLoading || ref === null ? (
        <AgendaSkeleton />
      ) : (
        events.map((event) => (
          <DraggableAgendaEvent key={event._id} event={event} />
        ))
      )}
    </Droppable>
  );
};
