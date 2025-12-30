import { FocusEvent, MouseEvent, useCallback } from "react";
import { getEntity } from "@ngneat/elf-entities";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import {
  CursorItem,
  openFloatingAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { eventsStore, setActiveEvent } from "@web/store/events";
import { useAppSelector } from "@web/store/store.hooks";
import { getEventClass } from "@web/views/Day/util/agenda/focus.util";

export function useOpenAgendaEventPreview() {
  const pendingEventIds = useAppSelector(
    (state) => state.events.pendingEvents.eventIds,
  );

  const openAgendaEventPreview = useCallback(
    (e: MouseEvent<Element> | FocusEvent<Element>) => {
      e.preventDefault();
      e.stopPropagation();

      const element = e.currentTarget;
      const eventClass = getEventClass(element);
      const reference = element?.closest(`.${eventClass}`);
      const eventId = reference?.getAttribute(DATA_EVENT_ELEMENT_ID);
      const nodeId = CursorItem.EventPreview;

      if (!eventId || !reference) return;

      const draftEvent = eventsStore.query(getEntity(eventId));

      if (!draftEvent) return;

      if (pendingEventIds.includes(eventId)) return;

      setActiveEvent(draftEvent._id);
      openFloatingAtCursor({ nodeId, placement: "right", reference });
    },
    [pendingEventIds],
  );

  return openAgendaEventPreview;
}
