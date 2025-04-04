import {
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { GenericError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { RecurringEventProcessor } from "../process/processor.interface";
import { Summary_SeriesChange_Compass } from "../recurrence.types";

/**
 * Manages recurring event operations in a processor-agnostic way
 */

export class RecurringEventManager {
  private processor: RecurringEventProcessor;

  constructor(processor: RecurringEventProcessor) {
    this.processor = processor;
  }

  /**
   * Main entrypoint that handles different recurring event actions
   * @param changes The action data containing events and action type
   */
  async handleAction(changes: Summary_SeriesChange_Compass) {
    const { action, baseEvent, newBaseEvent, modifiedInstance, deleteFrom } =
      changes;

    console.log("handling changes:");
    console.log(JSON.stringify(changes, null, 2));

    switch (action) {
      case "CREATE_SERIES":
        if (baseEvent) {
          return this.processor.createSeries(baseEvent);
        }
        break;

      case "UPDATE_INSTANCE":
        if (modifiedInstance) {
          return this.processor.updateInstance(modifiedInstance);
        }
        break;

      case "UPDATE_SERIES":
        // Series update with split (this and future)
        if (shouldSplitSeries(changes)) {
          console.log("++ updating series with split");
          return this.processor.updateSeriesWithSplit(
            baseEvent as Schema_Event_Recur_Base,
            modifiedInstance as Schema_Event_Recur_Instance,
          );
        }
        // Update entire series
        else if (baseEvent && newBaseEvent) {
          console.log("++ updating entire series");
          return this.processor.updateEntireSeries(baseEvent, newBaseEvent);
        }
        break;

      case "DELETE_INSTANCES":
        // Delete this and future
        if (baseEvent && deleteFrom && modifiedInstance) {
          return this.processor.deleteInstancesFromDate(baseEvent, deleteFrom);
        }
        // Delete single instance
        else if (modifiedInstance) {
          return this.processor.deleteSingleInstance(modifiedInstance);
        }
        break;

      case "DELETE_SERIES":
        if (baseEvent) {
          return this.processor.deleteSeries(baseEvent);
        }
        break;
    }

    throw error(
      GenericError.DeveloperError,
      `Unable to handle action: ${action}. Missing required event data.`,
    );
  }
}

export const shouldSplitSeries = (changes: Summary_SeriesChange_Compass) => {
  console.log("++ checking if shouldSplitSeries using these changes:");
  console.log(JSON.stringify(changes, null, 2));

  // If we have a base event with an UNTIL rule and a new base event with a rule but no UNTIL,
  // we need to split the series
  const baseEventHasUntil =
    changes.baseEvent?.recurrence?.rule?.[0]?.includes("UNTIL");
  const newBaseEventHasRule =
    changes.newBaseEvent?.recurrence?.rule?.[0] !== undefined;
  const newBaseEventHasNoUntil =
    !changes.newBaseEvent?.recurrence?.rule?.[0]?.includes("UNTIL");

  if (baseEventHasUntil && newBaseEventHasRule && newBaseEventHasNoUntil) {
    return true;
  }

  return false;
};
