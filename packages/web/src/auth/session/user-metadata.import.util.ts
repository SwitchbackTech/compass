import { type UserMetadata } from "@core/types/user.types";

export const isGoogleCalendarImportActive = (metadata: UserMetadata) => {
  const connectionState = metadata.google?.connectionState;
  const importStatus = metadata.sync?.importGCal;

  return (
    (importStatus === "IMPORTING" || importStatus === "RESTART") &&
    connectionState !== "NOT_CONNECTED" &&
    connectionState !== "RECONNECT_REQUIRED"
  );
};
