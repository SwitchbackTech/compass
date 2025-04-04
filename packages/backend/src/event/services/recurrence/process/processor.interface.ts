import {
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";

/**
 * Interface for recurring event processors
 * Any processor (Google, Apple, etc.) should implement this interface
 */
export interface RecurringEventProcessor {
  /**
   * Creates a new series of recurring events
   * @param event The base event to create the series from
   * @returns The inserted event ID
   */
  createSeries(event: Schema_Event_Recur_Base): Promise<{ insertedId: string }>;

  /**
   * Deletes all instances of a recurring event
   * @param baseEventId The ID of the base event
   * @returns Number of deleted instances
   */
  deleteAllInstances(baseEventId: string): Promise<{ deletedCount: number }>;

  /**
   * Deletes a single event instance
   * @param gEventId The Google Calendar event ID
   * @returns Number of deleted instances
   */
  deleteInstance(gEventId: string): Promise<{ deletedCount: number }>;

  /**
   * Deletes all instances of a recurring event except the base event
   * @param baseId The base event ID
   * @returns Number of deleted instances
   */
  deleteInstances(baseId: string): Promise<{ deletedCount: number }>;

  /**
   * Deletes all instances of a recurring event from a given date
   * @param fromDate The date from which to delete instances
   * @returns Number of deleted instances
   */
  deleteInstancesFromDate(
    baseEvent: Schema_Event_Recur_Base,
    fromDate: string,
  ): Promise<{ deletedCount: number }>;

  /**
   * Deletes a series of recurring events
   * @param baseEvent The base event to delete the series from
   * @returns Number of deleted instances
   */
  deleteSeries(
    baseEvent: Schema_Event_Recur_Base,
  ): Promise<{ deletedCount: number }>;

  /**
   * Deletes a single instance  of a recurring event
   * @param instance The instance to delete
   * @returns Number of deleted instances
   */
  deleteSingleInstance(
    instance: Schema_Event_Recur_Instance,
  ): Promise<{ deletedCount: number }>;

  /**
   * Expands a recurring event into its instances
   * @param baseEvent The base recurring event
   * @returns An array of event instances
   */
  expandInstances(
    baseEvent: Schema_Event_Recur_Base,
  ): Promise<Schema_Event_Recur_Instance[]>;

  /**
   * Inserts a base recurring event
   * @param event The base event to insert
   * @returns The inserted event ID
   */
  insertBaseEvent(
    event: Schema_Event_Recur_Base,
  ): Promise<{ insertedId: string }>;

  /**
   * Inserts multiple event instances
   * @param instances Array of event instances to insert
   * @returns Array of inserted event IDs
   */
  insertEventInstances(
    instances: Schema_Event_Recur_Instance[],
  ): Promise<{ insertedIds: string[] }>;
  /**
   * Updates the recurrence rule of a base event
   * @param gEventId The Google Calendar event ID
   * @param recurrence The new recurrence rule and base event ID
   * @returns Number of matched documents
   */
  updateBaseEventRecurrence(
    baseEventId: string,
    rule: string[],
  ): Promise<{ matchedCount: number }>;

  /**
   * Updates a single event instance
   * @param instance The updated event instance
   * @returns Number of matched documents
   */
  updateInstance(
    instance: Schema_Event_Recur_Instance,
  ): Promise<{ matchedCount: number }>;

  /**
   * Updates all future instances of a recurring event
   * @param event The updated event data to apply to future instances
   * @returns Number of matched documents
   */
  updateFutureInstances(event: Schema_Event): Promise<{ matchedCount: number }>;

  /**
   * Updates the entire series of recurring events
   * @param originalBase The original base event
   * @param newBase The new base event
   * @returns Number of matched documents
   */
  updateSeriesWithSplit(
    originalBase: Schema_Event_Recur_Base,
    modifiedInstance: Schema_Event_Recur_Instance,
  ): Promise<{ modifiedCount: number }>;

  /**
   * Updates the entire series of recurring events
   * @param originalBase The original base event
   * @param newBase The new base event
   */
  updateEntireSeries(
    originalBase: Schema_Event_Recur_Base,
    updatedBase: Schema_Event_Recur_Base,
  ): Promise<{ matchedCount: number }>;
}
