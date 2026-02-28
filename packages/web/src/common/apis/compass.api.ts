import axios, { AxiosError } from "axios";
import { toast } from "react-toastify";
import { Origin } from "@core/constants/core.constants";
import { GOOGLE_REVOKED } from "@core/constants/websocket.constants";
import { Status } from "@core/errors/status.codes";
import { getApiErrorCode } from "@web/common/apis/compass.api.util";
import { session } from "@web/common/classes/Session";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showSessionExpiredToast } from "@web/common/utils/toast/error-toast.util";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { triggerFetch } from "@web/ducks/events/slices/sync.slice";
import { store } from "@web/store";

export const CompassApi = axios.create({
  baseURL: ENV_WEB.API_BASEURL,
});

type SignoutStatus = Status.UNAUTHORIZED | Status.NOT_FOUND | Status.GONE;

const signOut = async (status: SignoutStatus) => {
  // since there are currently duplicate event fetches,
  // this prevents triggering a separate alert for each fetch
  // this can be removed once we have logic to cancel subsequent requests
  // after one failed
  if (status === Status.UNAUTHORIZED) {
    showSessionExpiredToast();
  } else {
    alert("Login required, cuz security 😇");
  }

  await session.signOut();

  if (window.location.pathname.startsWith(ROOT_ROUTES.DAY)) {
    return;
  }
  window.location.assign(ROOT_ROUTES.DAY);
};

const handleGoogleRevokedError = () => {
  if (!toast.isActive(GOOGLE_REVOKED_TOAST_ID)) {
    toast.error("Google access revoked. Your Google data has been removed.", {
      toastId: GOOGLE_REVOKED_TOAST_ID,
      autoClose: false,
    });
  }
  store.dispatch(
    eventsEntitiesSlice.actions.removeEventsByOrigin({
      origins: [Origin.GOOGLE, Origin.GOOGLE_IMPORT],
    }),
  );
  store.dispatch(
    triggerFetch({ reason: Sync_AsyncStateContextReason.GOOGLE_REVOKED }),
  );
};

CompassApi.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url;

    if (status === Status.REDUX_REFRESH_NEEDED) {
      window.location.reload();
      return Promise.resolve();
    }

    // Allow /user/profile 404s to be handled gracefully by UserProvider
    const isUserProfileNotFound =
      status === Status.NOT_FOUND && requestUrl?.includes("/user/profile");
    if (isUserProfileNotFound) {
      // Let UserProvider handle this gracefully - don't sign out
      return Promise.reject(error);
    }

    // Google revoked: keep user logged in, show toast, clear Google events, trigger refetch
    if (
      (status === Status.GONE || status === Status.UNAUTHORIZED) &&
      getApiErrorCode(error) === GOOGLE_REVOKED
    ) {
      handleGoogleRevokedError();
      return Promise.reject(error);
    }

    if (
      status === Status.GONE ||
      status === Status.NOT_FOUND ||
      status === Status.UNAUTHORIZED
    ) {
      await signOut(status);
    } else {
      console.error(error);
    }

    return Promise.reject(error);
  },
);
