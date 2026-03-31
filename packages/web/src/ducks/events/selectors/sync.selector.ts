import { type RootState } from "@web/store";

export type GoogleSyncIndicator =
  | {
      kind: "idle";
      tooltip: null;
    }
  | {
      kind: "repairing" | "syncing";
      tooltip: string;
    };

export const selectImportLatestState = ({ sync }: RootState) =>
  sync.importLatest;

export const selectImportGCalState = ({ sync }: RootState) => sync.importGCal;

export const selectImportResults = ({ sync }: RootState) =>
  sync.importGCal.importResults;

export const selectImportError = ({ sync }: RootState) =>
  sync.importGCal.importError;

export const selectGoogleSyncIndicator = (
  state: RootState,
): GoogleSyncIndicator => {
  const importState = selectImportGCalState(state);

  if (importState.isRepairing) {
    return {
      kind: "repairing",
      tooltip: "Repairing Google Calendar in the background.",
    };
  }

  if (importState.isProcessing === true) {
    return {
      kind: "syncing",
      tooltip: "Syncing Google Calendar in the background.",
    };
  }

  return {
    kind: "idle",
    tooltip: null,
  };
};
