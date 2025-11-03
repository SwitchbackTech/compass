import { Schema_Event } from "@core/types/event.types";

/**
 * Parser for determining if an event has been modified (is dirty)
 */
export class DirtyParser {
  /**
   * Private Static method to check if the recurrence rules have changed
   */
  private static isRuleDifferent(
    curr: Schema_Event,
    orig: Schema_Event,
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
  private static isDateDifferent(
    curr: Schema_Event,
    orig: Schema_Event,
  ): boolean {
    const oldStartDate = orig?.startDate;
    const newStartDate = curr?.startDate;
    const oldEndDate = orig?.endDate;
    const newEndDate = curr?.endDate;

    return oldStartDate !== newStartDate || oldEndDate !== newEndDate;
  }

  /**
   * Public Static method to check if recurrence has changed
   */
  public static recurrenceChanged(
    curr: Schema_Event,
    orig: Schema_Event,
  ): boolean {
    return (
      DirtyParser.isDateDifferent(curr, orig) ||
      DirtyParser.isRuleDifferent(curr, orig)
    );
  }

  /**
   * Static method to check if the curr event has been modified
   */
  static isEventDirty(curr: Schema_Event, orig: Schema_Event): boolean {
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
