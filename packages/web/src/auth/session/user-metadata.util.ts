import { Status } from "@core/errors/status.codes";
import { UserApi } from "@web/common/apis/user.api";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { store } from "@web/store";

let refreshUserMetadataRequest: Promise<void> | null = null;

export const refreshUserMetadata = async (): Promise<void> => {
  if (refreshUserMetadataRequest) {
    return refreshUserMetadataRequest;
  }

  store.dispatch(userMetadataSlice.actions.setLoading());

  refreshUserMetadataRequest = UserApi.getMetadata()
    .then((metadata) => {
      store.dispatch(userMetadataSlice.actions.set(metadata));
    })
    .catch((error) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      const isUnauthorized =
        status === Status.UNAUTHORIZED || status === Status.FORBIDDEN;

      if (isUnauthorized) {
        store.dispatch(userMetadataSlice.actions.clear());
        return;
      }

      console.error("Failed to refresh user metadata", error);
      store.dispatch(userMetadataSlice.actions.finishLoading());
    })
    .finally(() => {
      refreshUserMetadataRequest = null;
    });

  return refreshUserMetadataRequest;
};
