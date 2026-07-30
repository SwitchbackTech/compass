import { type DateTime } from "@core/types/domain-primitives";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";

// Whether a series exception is a cancelled tombstone (a per-instance deletion)
// rather than a content override. Shared by the cloud and provider command
// paths — both need to tell "cancelled" exceptions apart from "overridden"
// ones when reprojecting a series.
export function isCancelledException(event: EventRecord): boolean {
  return event.recurrence.kind === "exception" && event.recurrence.cancelled;
}

// The original instant a series exception overrides — its recurrence identity.
export function exceptionInstant(event: EventRecord): DateTime {
  if (event.recurrence.kind !== "exception") {
    throw new Error("exceptionInstant requires an exception event");
  }
  return event.recurrence.recurrenceId;
}
