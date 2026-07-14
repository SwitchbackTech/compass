import { type RecurrenceScope } from "@core/types/event-command.contracts";
import { RecurringEventUpdateScope } from "@web/common/types/web.event.types";

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
