import {
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { GenericError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";

/**
 * Get the until value for the original base event
 * @param originalBase The original base event
 * @param modifiedInstance The modified instance
 * @returns The until value
 */
export const getUntilValue = async (
  originalBase: Schema_Event_Recur_Base,
  modifiedInstance: Schema_Event_Recur_Instance,
) => {
  if (!modifiedInstance.recurrence?.eventId) {
    throw error(
      GenericError.DeveloperError,
      "Failed to update recurring event series because eventId was missing",
    );
  }

  if (
    !originalBase ||
    !originalBase.recurrence?.rule ||
    !modifiedInstance.startDate
  ) {
    throw error(
      GenericError.DeveloperError,
      "Failed to update recurring event series because required fields were missing",
    );
  }

  // Update the original base event to end before the modified instance
  const untilDate =
    new Date(modifiedInstance.startDate)
      .toISOString()
      .replace(/[-:]/g, "")
      .split(".")[0] + "Z";
  return untilDate;
};
