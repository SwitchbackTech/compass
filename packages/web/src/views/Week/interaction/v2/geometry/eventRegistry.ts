import { type Schema_GridEvent } from "@web/common/types/web.event.types";

export interface RegisteredWeekEvent {
  element: HTMLElement;
  event: Schema_GridEvent;
  kind: "timed" | "allDay";
}

const registry = new Map<string, RegisteredWeekEvent>();

export const registerWeekEventElement = (
  id: string,
  entry: RegisteredWeekEvent,
) => {
  registry.set(id, entry);

  return () => {
    if (registry.get(id)?.element === entry.element) {
      registry.delete(id);
    }
  };
};

export const getRegisteredWeekEvent = (id: string) => registry.get(id) ?? null;
