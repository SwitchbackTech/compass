import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import { type BusyPeriod, type Event } from "@core/types/event.contracts";

export type EventEntityMap = Record<EventId, Event>;

export type NormalizedEvents = {
  ids: EventId[];
  entities: EventEntityMap;
};

export type OptimisticEvent = {
  event: Event;
  mutation: {
    id: string;
    state: "creating" | "updating" | "deleting" | "failed";
  };
};

// Layout code consumes GridCalendarItem; mutation code narrows
// CalendarItem.kind === "event" before exposing actions.
export type CalendarItem =
  | { kind: "event"; event: Event }
  | { kind: "busyPeriod"; busyPeriod: BusyPeriod };

export type GridEventLayout = {
  top: number;
  left: number;
  width: number;
  height: number;
  zIndex: number;
  isOverlapping: boolean;
  dragOffset: { x: number; y: number };
};

export type GridCalendarItem = {
  item: CalendarItem;
  layout: GridEventLayout;
};

export type SelectedDateRange = {
  start: Date;
  end: Date;
  kind: "timed" | "allDay";
};

export type SomedayColumnView = {
  period: "week" | "month";
  anchorDate: string;
  eventIds: EventId[];
};

export type CalendarEventIndex = Record<CalendarId, EventId[]>;
