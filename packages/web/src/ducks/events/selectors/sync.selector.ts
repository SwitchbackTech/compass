import { RootState } from "@web/store";

export const selectImportLatestState = ({ sync }: RootState) =>
  sync.importLatest;

export const selectImportGCalState = ({ sync }: RootState) => sync.importGCal;

export const selectImporting = ({ sync }: RootState) =>
  sync.importGCal.importing;

export const selectAwaitingImportResults = ({ sync }: RootState) =>
  sync.importGCal.awaitingImportResults;

export const selectImportResults = ({ sync }: RootState) =>
  sync.importGCal.importResults;

export const selectImportError = ({ sync }: RootState) =>
  sync.importGCal.importError;
