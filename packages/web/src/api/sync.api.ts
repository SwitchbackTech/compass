import { BaseApi } from "./base/base.api";

const SyncApi = {
  async importGCal(options?: { force?: boolean }) {
    return BaseApi.post<void>(`/sync/import-gcal`, options);
  },
};

export { SyncApi };
