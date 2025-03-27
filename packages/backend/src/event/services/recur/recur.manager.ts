import { Schema_Event } from "@core/types/event.types";
import { GenericError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  deleteAllInstances,
  deleteFutureInstances,
  deleteInstance,
  insertBaseEvent,
  insertEventInstances,
  updateBaseEventRecurrence,
  updateInstance,
} from "@backend/event/queries/event.recur.queries";
import { RecurringEventProvider } from "./providers/recur.provider.interface";
import { Summary_SeriesChange_Compass } from "./recur.types";

/**
 * Manages recurring event operations in a provider-agnostic way
 */
export class RecurringEventManager {
  private userId: string;
  private provider: RecurringEventProvider;

  constructor(userId: string, provider: RecurringEventProvider) {
    this.userId = userId;
    this.provider = provider;
  }

  /**
   * Main entrypoint that handles different recurring event actions
   * @param input The action data containing events and action type
   */
  async handleAction(input: Summary_SeriesChange_Compass) {
    const { action, baseEvent, newBaseEvent, modifiedInstance, endDate } =
      input;

    switch (action) {
      case "CREATE_SERIES":
        if (baseEvent) {
          return this.createSeries(baseEvent);
        }
        break;

      case "UPDATE_INSTANCE":
        if (modifiedInstance) {
          return this.updateInstance(modifiedInstance);
        }
        break;

      case "UPDATE_SERIES":
        // Series update with split (this and future)
        if (baseEvent && newBaseEvent && modifiedInstance) {
          return this.updateSeriesWithSplit(
            baseEvent,
            newBaseEvent,
            modifiedInstance,
          );
        }
        // Update entire series
        else if (baseEvent && newBaseEvent) {
          return this.updateEntireSeries(baseEvent, newBaseEvent);
        }
        break;

      case "DELETE_INSTANCES":
        // Delete this and future
        if (baseEvent && endDate && modifiedInstance) {
          return this.deleteInstancesFromDate(baseEvent, endDate);
        }
        // Delete single instance
        else if (modifiedInstance) {
          return this.deleteSingleInstance(modifiedInstance);
        }
        break;

      case "DELETE_SERIES":
        if (baseEvent) {
          return this.deleteSeries(baseEvent);
        }
        break;
    }

    throw error(
      GenericError.DeveloperError,
      `Unable to handle action: ${action}. Missing required event data.`,
    );
  }

  /**
   * Create a new recurring event series
   * Maps to action: CREATE_SERIES
   */
  async createSeries(event: Schema_Event) {
    // Create base event
    await insertBaseEvent(event);

    // Expand and store instances
    const instances = await this.provider.expandRecurringEvent(event);
    await insertEventInstances(instances);
  }

  /**
   * Update a single instance of a recurring event
   * Maps to action: UPDATE_INSTANCE
   */
  async updateInstance(instance: Schema_Event) {
    const result = await updateInstance(this.userId, instance);
    return result;
  }

  /**
   * Updates a series by splitting it at a specific point
   * Maps to action: UPDATE_SERIES with endDate and newBaseEvent
   */
  async updateSeriesWithSplit(
    originalBase: Schema_Event,
    newBase: Schema_Event,
    modifiedInstance: Schema_Event,
  ) {
    // 1. Update original base event with UNTIL rule
    if (
      originalBase.recurrence?.rule &&
      originalBase.gEventId &&
      modifiedInstance.startDate
    ) {
      await updateBaseEventRecurrence(originalBase.gEventId, {
        rule: originalBase.recurrence.rule.map((rule) =>
          rule.includes("UNTIL")
            ? rule
            : `${rule};UNTIL=${modifiedInstance.startDate}`,
        ),
        eventId: originalBase.gEventId,
      });
    }

    // 2. Create new base event
    await insertBaseEvent(newBase);

    // 3. Delete future instances from original series
    if (originalBase.gEventId && modifiedInstance.startDate) {
      await deleteFutureInstances(
        originalBase.gEventId,
        modifiedInstance.startDate,
      );
    }

    // 4. Create new instances for new series
    const newInstances = await this.provider.expandRecurringEvent(newBase);
    await insertEventInstances(newInstances);
  }

  /**
   * Update an entire series
   * Maps to action: UPDATE_SERIES without newBaseEvent
   */
  async updateEntireSeries(
    originalBase: Schema_Event,
    updatedBase: Schema_Event,
  ) {
    // 1. Delete all instances of original series
    if (originalBase.gEventId) {
      await deleteAllInstances(originalBase.gEventId);
    }

    // 2. Create new base event
    await insertBaseEvent(updatedBase);

    // 3. Create new instances
    const newInstances = await this.provider.expandRecurringEvent(updatedBase);
    await insertEventInstances(newInstances);
  }

  /**
   * Delete a single instance
   * Maps to action: DELETE_INSTANCES with single instance
   */
  async deleteSingleInstance(instance: Schema_Event) {
    if (instance.gEventId) {
      await deleteInstance(instance.gEventId);
    }
  }

  /**
   * Delete instances from a specific date forward
   * Maps to action: DELETE_INSTANCES with UNTIL
   */
  async deleteInstancesFromDate(
    baseEvent: Schema_Event,
    deleteFromDate: string,
  ) {
    // 1. Update base event with UNTIL rule
    if (baseEvent.recurrence?.rule && baseEvent.gEventId) {
      await updateBaseEventRecurrence(baseEvent.gEventId, {
        rule: baseEvent.recurrence.rule.map((rule) =>
          rule.includes("UNTIL") ? rule : `${rule};UNTIL=${deleteFromDate}`,
        ),
        eventId: baseEvent.gEventId,
      });
    }

    // 2. Delete future instances
    if (baseEvent.gEventId) {
      await deleteFutureInstances(baseEvent.gEventId, deleteFromDate);
    }
  }

  /**
   * Delete an entire series
   * Maps to action: DELETE_SERIES
   */
  async deleteSeries(baseEvent: Schema_Event) {
    if (baseEvent.gEventId) {
      await deleteAllInstances(baseEvent.gEventId);
    }
  }
}
