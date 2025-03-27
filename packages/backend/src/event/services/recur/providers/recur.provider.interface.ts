import { Schema_Event } from "@core/types/event.types";

/**
 * Interface for recurring event providers
 * Any provider implementation (Google, Apple, etc.) should implement this interface
 */
export interface RecurringEventProvider {
  /**
   * Expands a recurring event into its instances
   * @param baseEvent The base recurring event
   * @returns An array of event instances
   */
  expandRecurringEvent(baseEvent: Schema_Event): Promise<Schema_Event[]>;
}
