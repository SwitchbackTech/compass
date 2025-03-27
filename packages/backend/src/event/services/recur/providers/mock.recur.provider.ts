import dayjs from "dayjs";
import { Schema_Event } from "@core/types/event.types";
import { RecurringEventProvider } from "./recur.provider.interface";

/**
 * Mock implementation of RecurringEventProvider for testing purposes
 * Generates recurring event instances based on simple rules without
 * requiring external API calls
 */
export class MockRecurringEventProvider implements RecurringEventProvider {
  constructor(private userId: string) {}

  /**
   * Create simple recurring event instances based on the recurrence rule
   * @param baseEvent The base recurring event
   */
  async expandRecurringEvent(baseEvent: Schema_Event): Promise<Schema_Event[]> {
    if (!baseEvent.recurrence?.rule || baseEvent.recurrence.rule.length === 0) {
      return [];
    }

    const rrule = baseEvent.recurrence.rule[0];
    const instances: Schema_Event[] = [];

    // Parse the rule to determine frequency and any end date
    const frequency = this.getFrequency(rrule);
    const until = this.getUntilDate(rrule);

    // Default to 6 months from now if no end date
    const endDate = until || dayjs().add(6, "months").toISOString();

    // Generate instances based on frequency
    // Ensure we have default values for potentially undefined fields
    const defaultDate = new Date().toISOString();
    const startDateStr = baseEvent.startDate || defaultDate;
    const endDateStr =
      baseEvent.endDate || dayjs(startDateStr).add(1, "hour").toISOString();
    const baseEventId = baseEvent.gEventId || "";
    const recurEventId = baseEvent.recurrence.eventId || baseEventId;

    const startDate = dayjs(startDateStr);
    let currentDate = startDate;
    let instanceCount = 0;

    // Limit to a reasonable number of instances to prevent infinite loops
    const MAX_INSTANCES = 100;

    while (currentDate.isBefore(endDate) && instanceCount < MAX_INSTANCES) {
      // Skip the first instance (it's the base event)
      if (instanceCount > 0) {
        const instanceId = `${baseEventId}_instance_${instanceCount}`;

        instances.push({
          ...baseEvent,
          _id: undefined, // Remove the base event ID
          gEventId: instanceId,
          startDate: currentDate.toISOString(),
          endDate: this.adjustEndDate(
            endDateStr,
            startDateStr,
            currentDate.toISOString(),
          ),
          recurrence: {
            eventId: recurEventId,
          },
        });
      }

      // Advance to the next instance based on frequency
      currentDate = this.advanceDate(currentDate, frequency);
      instanceCount++;
    }

    return instances;
  }

  /**
   * Extract frequency from RRULE
   */
  private getFrequency(rrule: string): string {
    if (rrule.includes("FREQ=DAILY")) return "daily";
    if (rrule.includes("FREQ=WEEKLY")) return "weekly";
    if (rrule.includes("FREQ=MONTHLY")) return "monthly";
    if (rrule.includes("FREQ=YEARLY")) return "yearly";
    return "daily"; // Default to daily
  }

  /**
   * Extract UNTIL date from RRULE if it exists
   */
  private getUntilDate(rrule: string): string | null {
    const untilMatch = rrule.match(/UNTIL=([^;]+)/);
    return untilMatch ? untilMatch[1] : null;
  }

  /**
   * Advance date based on frequency
   */
  private advanceDate(date: dayjs.Dayjs, frequency: string): dayjs.Dayjs {
    switch (frequency) {
      case "daily":
        return date.add(1, "day");
      case "weekly":
        return date.add(1, "week");
      case "monthly":
        return date.add(1, "month");
      case "yearly":
        return date.add(1, "year");
      default:
        return date.add(1, "day");
    }
  }

  /**
   * Adjust end date to maintain the same duration
   */
  private adjustEndDate(
    originalEnd: string,
    originalStart: string,
    newStart: string,
  ): string {
    const duration = dayjs(originalEnd).diff(dayjs(originalStart));
    return dayjs(newStart).add(duration, "millisecond").toISOString();
  }
}
