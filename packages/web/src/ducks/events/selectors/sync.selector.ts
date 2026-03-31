import { type RootState } from "@web/store";

export const selectImportLatestState = ({ sync }: RootState) =>
  sync.importLatest;
