import { Schema_WebEvent } from "@web/common/types/web.event.types";

/**
 * Parser for determining if an event has been modified (is dirty)
 */
export class DirtyParser {
  /**
   * Private Static method to check if the recurrence rules have changed
   */
  private static ruleChanged(
    curr: Schema_WebEvent,
    orig: Schema_WebEvent,
  ): boolean {
    const oldRecurrence = orig?.recurrence?.rule ?? [];
    const newRecurrence = curr?.recurrence?.rule ?? [];

    if (oldRecurrence.length !== newRecurrence.length) return true;

    const oldRuleFields = oldRecurrence.flatMap((rule) => rule.split(";"));
    const newRuleFields = newRecurrence.flatMap((rule) => rule.split(";"));
    const oldRuleSet = [...new Set(oldRuleFields)];
    const newRuleSet = [...new Set(newRuleFields)];

    return (
      newRuleSet.some((rule) => !oldRuleSet.includes(rule)) ||
      oldRuleSet.some((rule) => !newRuleSet.includes(rule))
    );
  }

  /**
   * Private Static method to check if start or end dates have changed
   */
  private static dateChanged(
    curr: Schema_WebEvent,
    orig: Schema_WebEvent,
  ): boolean {
    const oldStartDate = orig?.startDate;
    const newStartDate = curr?.startDate;
    const oldEndDate = orig?.endDate;
    const newEndDate = curr?.endDate;

    return oldStartDate !== newStartDate || oldEndDate !== newEndDate;
  }

  /**
   * Private Static method to check if recurrence has changed
   */
  private static recurrenceChanged(
    curr: Schema_WebEvent,
    orig: Schema_WebEvent,
  ): boolean {
    return (
      DirtyParser.dateChanged(curr, orig) || DirtyParser.ruleChanged(curr, orig)
    );
  }

  /**
   * Static method to check if the curr event has been modified
   */
  static eventDirty(curr: Schema_WebEvent, orig: Schema_WebEvent): boolean {
    // Compare relevant fields that can change in the form
    const fieldsToCompare = [
      "title",
      "description",
      "startDate",
      "endDate",
      "priority",
      "recurrence",
    ] as const;

    return fieldsToCompare.some((field) => {
      const current = curr[field];
      const original = orig[field];
      const isRecurrenceField = field === "recurrence";

      return isRecurrenceField
        ? DirtyParser.recurrenceChanged(curr, orig)
        : current !== original;
    });
  }
}
