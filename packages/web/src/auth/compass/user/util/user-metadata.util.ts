import { Status } from "@core/errors/status.codes";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { UserApi } from "@web/common/apis/user.api";

let refreshUserMetadataRequest: Promise<void> | null = null;

export const refreshUserMetadata = async (): Promise<void> => {
  if (refreshUserMetadataRequest) {
    return refreshUserMetadataRequest;
  }

  userMetadataActions.setLoading();

  refreshUserMetadataRequest = UserApi.getMetadata()
    .then((metadata) => {
      userMetadataActions.set(metadata);
    })
    .catch((error) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      const isUnauthorized =
        status === Status.UNAUTHORIZED || status === Status.FORBIDDEN;

      if (isUnauthorized) {
        userMetadataActions.clear();
        return;
      }

      console.error("Failed to refresh user metadata", error);
      userMetadataActions.finishLoading();
    })
    .finally(() => {
      refreshUserMetadataRequest = null;
    });

  return refreshUserMetadataRequest;
};
