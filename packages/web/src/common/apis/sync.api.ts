import { GCAL_NOTIFICATION_BASE } from "@core/constants/core.constants";

import { CompassApi } from "./compass.api";

const SyncApi = {
  async stopWatches() {
    const response = await CompassApi.post(
      `${GCAL_NOTIFICATION_BASE}/stop-all`
    );
    return response;
  },
};

export { SyncApi };
