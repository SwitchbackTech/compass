import { CompassApi } from "./compass.api";

const SyncApi = {
  async stopWatches() {
    const response = await CompassApi.post(`/sync/stop-all`);
    return response;
  },

  async importGCal() {
    return CompassApi.post<void>(`/sync/import-gcal`);
  },
};

export { SyncApi };
