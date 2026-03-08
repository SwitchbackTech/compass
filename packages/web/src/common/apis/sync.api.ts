import { CompassApi } from "./compass.api";

const SyncApi = {
  async importGCal(options?: { force?: boolean }) {
    return CompassApi.post<void>(`/sync/import-gcal`, options);
  },
};

export { SyncApi };
