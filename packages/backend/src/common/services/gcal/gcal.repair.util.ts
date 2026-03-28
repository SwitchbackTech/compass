import { isGoogleRepairQuotaError } from "./gcal.utils";

export const GOOGLE_REPAIR_FAILED_MESSAGE =
  "Google Calendar repair failed. Please try again.";
export const GOOGLE_REPAIR_QUOTA_MESSAGE =
  "Google Calendar repair hit a Google API limit. Please wait a few minutes and try again.";

export const getGoogleRepairErrorMessage = (err: unknown): string =>
  isGoogleRepairQuotaError(err)
    ? GOOGLE_REPAIR_QUOTA_MESSAGE
    : GOOGLE_REPAIR_FAILED_MESSAGE;
