import { type Event } from "@core/types/event.contracts";
import {
  type EventPresentation,
  type GridEventPresentation,
} from "./event-view.types";

const basePresentation = (event: Event) => ({
  eventId: event.id,
  calendarId: event.calendarId,
  content: event.content,
  priority: event.priority,
  recurrence: event.recurrence,
});

export function presentEvent(event: Event): EventPresentation {
  return { ...basePresentation(event), ...event.schedule };
}

export function presentGridEvent(event: Event): GridEventPresentation | null {
  return presentEvent(event);
}
