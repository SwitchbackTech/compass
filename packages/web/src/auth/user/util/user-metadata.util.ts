import { Status } from "@core/errors/status.codes";
import { UserApi } from "@web/common/apis/user.api";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import { store } from "@web/store";
import { isGoogleCalendarImportActive } from "./user-metadata.import.util";

let refreshUserMetadataRequest: Promise<void> | null = null;

export const refreshUserMetadata = async (): Promise<void> => {
  if (refreshUserMetadataRequest) {
    return refreshUserMetadataRequest;
  }

  store.dispatch(userMetadataSlice.actions.setLoading(undefined));

  refreshUserMetadataRequest = UserApi.getMetadata()
    .then((metadata) => {
      store.dispatch(userMetadataSlice.actions.set(metadata));
      if (isGoogleCalendarImportActive(metadata)) {
        store.dispatch(importGCalSlice.actions.request());
      }
    })
    .catch((error) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      const isUnauthorized =
        status === Status.UNAUTHORIZED || status === Status.FORBIDDEN;

      if (isUnauthorized) {
        store.dispatch(userMetadataSlice.actions.clear(undefined));
        return;
      }

      console.error("Failed to refresh user metadata", error);
      store.dispatch(userMetadataSlice.actions.finishLoading(undefined));
    })
    .finally(() => {
      refreshUserMetadataRequest = null;
    });

  return refreshUserMetadataRequest;
};
