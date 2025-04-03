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
   * @param input The action data containing events and action type
   */
  async handleAction(input: Summary_SeriesChange_Compass) {
    const { action, baseEvent, newBaseEvent, modifiedInstance, deleteFrom } =
      input;

    console.log(input);
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
        if (baseEvent && newBaseEvent && modifiedInstance) {
          return this.processor.updateSeriesWithSplit(
            baseEvent,
            modifiedInstance,
          );
        }
        // Update entire series
        else if (baseEvent && newBaseEvent) {
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
