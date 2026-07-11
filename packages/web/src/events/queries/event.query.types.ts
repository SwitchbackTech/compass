import { type Priority } from "@core/types/domain-primitives";
import { type NormalizedEvents } from "@web/events/event-view.types";
import { type EventRepositorySource } from "@web/events/repositories/event.repository.factory";

export type NormalizedEventQueryData = NormalizedEvents;

export type EventQueryScope = "day" | "week" | "someday";

// "day"/"week" entries key on an instant range (+ optional priority filter);
// "someday" entries key on the exact (period, anchorDate) pair the backend
// partitions on (A35 — no range, each period is one bounded read).
export type EventQueryKeyMetadata =
  | {
      source: EventRepositorySource;
      start: string;
      end: string;
      priorities: Priority[];
    }
  | {
      source: EventRepositorySource;
      period: "week" | "month";
      anchorDate: string;
    };

export type EventQueryKey = readonly [
  "events",
  EventQueryScope,
  EventQueryKeyMetadata,
];
