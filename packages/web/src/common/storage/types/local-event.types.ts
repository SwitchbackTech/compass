import { type Event_Core } from "@core/types/event.types";

export const LOCAL_DEMO_EVENT_FIELD = "__compassDemoEvent";

export type LocalStoredEvent = Event_Core & {
  [LOCAL_DEMO_EVENT_FIELD]?: true;
  order?: number;
};

export function markLocalDemoEvent<T extends Event_Core>(
  event: T,
): T & Pick<LocalStoredEvent, typeof LOCAL_DEMO_EVENT_FIELD> {
  return {
    ...event,
    [LOCAL_DEMO_EVENT_FIELD]: true,
  };
}

export function isLocalDemoEvent(event: Event_Core): boolean {
  return (event as LocalStoredEvent)[LOCAL_DEMO_EVENT_FIELD] === true;
}

export function preserveLocalEventMarker<T extends Event_Core>(
  existingEvent: Event_Core | undefined,
  nextEvent: T,
): T | (T & Pick<LocalStoredEvent, typeof LOCAL_DEMO_EVENT_FIELD>) {
  if (!existingEvent || !isLocalDemoEvent(existingEvent)) {
    return nextEvent;
  }

  return markLocalDemoEvent(nextEvent);
}
