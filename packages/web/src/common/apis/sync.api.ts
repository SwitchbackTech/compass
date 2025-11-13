import { CompassApi } from "./compass.api";

const SyncApi = {
  async importGCal() {
    return CompassApi.post<void>(`/sync/import-gcal`);
  },
};

export { SyncApi };
