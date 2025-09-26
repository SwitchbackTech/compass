import { Schema_WebEvent } from "../types/web.event.types";

/**
 * Parser for determining if an event has been modified (is dirty)
 */
export class WebEventParser {
  private readonly curr: Schema_WebEvent;
  private readonly orig: Schema_WebEvent;

  constructor(curr: Schema_WebEvent, orig: Schema_WebEvent) {
    this.curr = curr;
    this.orig = orig;
  }

  /**
   * Public method to check if the event is dirty (has been modified)
   */
  public isDirty(): boolean {
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
      const current = this.curr[field];
      const original = this.orig[field];
      const isRecurrenceField = field === "recurrence";

      return isRecurrenceField
        ? this.isRecurrenceChanged()
        : current !== original;
    });
  }

  /**
   * Private method to check if recurrence has changed
   */
  private isRecurrenceChanged(): boolean {
    if (!this.orig) return false;

    const isDateChanged = this.isDateChanged();
    const oldRecurrence = this.orig?.recurrence?.rule ?? [];
    const newRecurrence = this.curr?.recurrence?.rule ?? [];

    // Check if recurrence existence has changed
    const oldHasRecurrence =
      Array.isArray(oldRecurrence) && oldRecurrence.length > 0;
    const newHasRecurrence =
      Array.isArray(newRecurrence) && newRecurrence.length > 0;

    if (oldHasRecurrence !== newHasRecurrence) {
      return true;
    }

    // If both have recurrence, compare the rules
    if (oldHasRecurrence && newHasRecurrence) {
      // First check if the arrays are different in length or content
      if (oldRecurrence.length !== newRecurrence.length) {
        return true;
      }

      // Check if any rule is different
      for (let i = 0; i < oldRecurrence.length; i++) {
        if (oldRecurrence[i] !== newRecurrence[i]) {
          return true;
        }
      }

      // Also check for date changes
      return isDateChanged;
    }

    // If neither has recurrence, only check date changes
    return isDateChanged;
  }

  /**
   * Private method to check if the event has recurrence rules
   */
  private isRecurrence(): boolean {
    const hasRRule = Array.isArray(this.curr?.recurrence?.rule);
    return hasRRule;
  }

  /**
   * Private method to check if start or end dates have changed
   */
  private isDateChanged(): boolean {
    const oldStartDate = this.orig?.startDate;
    const newStartDate = this.curr?.startDate;
    const oldEndDate = this.orig?.endDate;
    const newEndDate = this.curr?.endDate;

    return oldStartDate !== newStartDate || oldEndDate !== newEndDate;
  }
}

export const isEventDirty = (
  curr: Schema_WebEvent,
  orig: Schema_WebEvent,
): boolean => {
  const parser = new WebEventParser(curr, orig);
  return parser.isDirty();
};
