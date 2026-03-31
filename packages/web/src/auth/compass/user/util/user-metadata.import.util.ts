import { type UserMetadata } from "@core/types/user.types";

const isGoogleConnected = (metadata: UserMetadata) => {
  const connectionState = metadata.google?.connectionState;
  return (
    connectionState !== "NOT_CONNECTED" &&
    connectionState !== "RECONNECT_REQUIRED"
  );
};

/** Returns true when an import is actively in progress (show spinner). */
export const isGoogleCalendarImportActive = (metadata: UserMetadata) => {
  return (
    metadata.sync?.importGCal === "IMPORTING" && isGoogleConnected(metadata)
  );
};
