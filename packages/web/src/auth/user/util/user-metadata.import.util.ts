import { type UserMetadata } from "@core/types/user.types";
import {
  hasAutoImportBeenTriggeredForRestart,
  markAutoImportTriggeredForRestart,
  resetAutoImportTriggeredForRestart,
} from "@web/auth/google/google-sync-ui.state";
import { SyncApi } from "@web/common/apis/sync.api";

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

/** Returns true when a new import needs to be triggered (RESTART state). */
export const isGoogleCalendarAutoImportNeeded = (metadata: UserMetadata) => {
  return metadata.sync?.importGCal === "RESTART" && isGoogleConnected(metadata);
};

export const reconcileGoogleCalendarAutoImport = (metadata: UserMetadata) => {
  if (!isGoogleCalendarAutoImportNeeded(metadata)) {
    resetAutoImportTriggeredForRestart();
    return;
  }

  if (hasAutoImportBeenTriggeredForRestart()) {
    return;
  }

  markAutoImportTriggeredForRestart();

  void SyncApi.importGCal().catch((error) => {
    console.error("Failed to start Google Calendar auto-import", error);
  });
};
