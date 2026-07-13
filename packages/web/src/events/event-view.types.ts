import {
  type CalendarId,
  type EventId,
  type Priority,
} from "@core/types/domain-primitives";
import {
  type BusyPeriod,
  type Event,
  type EventContent,
  type EventRecurrence,
} from "@core/types/event.contracts";

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

export type CalendarEventIndex = Record<CalendarId, EventId[]>;

type EventPresentationBase = {
  eventId: EventId;
  calendarId: CalendarId;
  content: EventContent;
  priority: Priority;
  recurrence: EventRecurrence;
};

type TimedSchedule = Extract<Event["schedule"], { kind: "timed" }>;
type AllDaySchedule = Extract<Event["schedule"], { kind: "allDay" }>;

export type TimedGridEventPresentation = EventPresentationBase & {
  kind: "timed";
  start: TimedSchedule["start"];
  end: TimedSchedule["end"];
  timeZone: TimedSchedule["timeZone"];
};

export type AllDayGridEventPresentation = EventPresentationBase & {
  kind: "allDay";
  start: AllDaySchedule["start"];
  /** Exclusive end date, matching the persisted event contract. */
  end: AllDaySchedule["end"];
};

export type GridEventPresentation =
  | TimedGridEventPresentation
  | AllDayGridEventPresentation;

export type EventPresentation = GridEventPresentation;
