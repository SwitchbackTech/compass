import { type UserMetadata } from "@core/types/user.types";
import { selectImportGCalState } from "@web/ducks/events/selectors/sync.selector";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import { type AppDispatch, type RootState } from "@web/store";

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

export const reconcileGoogleCalendarImportState = ({
  dispatch,
  getState,
  metadata,
}: {
  dispatch: AppDispatch;
  getState: () => RootState;
  metadata: UserMetadata;
}) => {
  dispatch(importGCalSlice.actions.reconcileImportStateFromMetadata(metadata));

  const importState = selectImportGCalState(getState());
  const shouldTriggerAutoImport =
    isGoogleCalendarAutoImportNeeded(metadata) &&
    !importState.isAutoImportPending &&
    !importState.isProcessing &&
    !importState.isRepairing;

  if (shouldTriggerAutoImport) {
    dispatch(importGCalSlice.actions.triggerAutoImport());
  }
};
