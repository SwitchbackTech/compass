import { CompassApi } from "./compass.api";

const SyncApi = {
  async stopWatches() {
    const response = await CompassApi.post(`/sync/stop-all`);
    return response;
  },
};

export { SyncApi };
