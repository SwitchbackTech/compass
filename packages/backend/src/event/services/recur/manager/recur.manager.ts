import { Logger } from "@core/logger/winston.logger";
import { GenericError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { RecurringEventProvider } from "../providers/recur.provider.interface";
import { Summary_SeriesChange_Compass } from "../recur.types";

/**
 * Manages recurring event operations in a provider-agnostic way
 */
const logger = Logger("recur.manager");

export class RecurringEventManager {
  private provider: RecurringEventProvider;

  constructor(provider: RecurringEventProvider) {
    this.provider = provider;
  }

  /**
   * Main entrypoint that handles different recurring event actions
   * @param input The action data containing events and action type
   */
  async handleAction(input: Summary_SeriesChange_Compass) {
    const { action, baseEvent, newBaseEvent, modifiedInstance, deleteFrom } =
      input;

    logger.debug(input);
    switch (action) {
      case "CREATE_SERIES":
        if (baseEvent) {
          return this.provider.createSeries(baseEvent);
        }
        break;

      case "UPDATE_INSTANCE":
        if (modifiedInstance) {
          return this.provider.updateInstance(modifiedInstance);
        }
        break;

      case "UPDATE_SERIES":
        // Series update with split (this and future)
        if (baseEvent && newBaseEvent && modifiedInstance) {
          return this.provider.updateSeriesWithSplit(
            baseEvent,
            newBaseEvent,
            modifiedInstance,
          );
        }
        // Update entire series
        else if (baseEvent && newBaseEvent) {
          return this.provider.updateEntireSeries(baseEvent, newBaseEvent);
        }
        break;

      case "DELETE_INSTANCES":
        // Delete this and future
        if (baseEvent && deleteFrom && modifiedInstance) {
          return this.provider.deleteInstancesFromDate(baseEvent, deleteFrom);
        }
        // Delete single instance
        else if (modifiedInstance) {
          return this.provider.deleteSingleInstance(modifiedInstance);
        }
        break;

      case "DELETE_SERIES":
        if (baseEvent) {
          return this.provider.deleteSeries(baseEvent);
        }
        break;
    }

    throw error(
      GenericError.DeveloperError,
      `Unable to handle action: ${action}. Missing required event data.`,
    );
  }
}
