import { RootState } from "@web/store";

export const selectImportLatestState = ({ sync }: RootState) =>
  sync.importLatest;

export const selectImportGCalState = ({ sync }: RootState) => sync.importGCal;
