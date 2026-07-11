import { RecurringEventUpdateScope } from "@core/types/event.types";
import { type RecurrenceScope } from "@core/types/event-command.contracts";

export function toRecurrenceScope(
  scope?: RecurringEventUpdateScope,
): RecurrenceScope {
  switch (scope) {
    case RecurringEventUpdateScope.ALL_EVENTS:
      return "all";
    case RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS:
      return "thisAndFollowing";
    default:
      return "this";
  }
}
