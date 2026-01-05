import axios, { AxiosError } from "axios";
import { Status } from "@core/errors/status.codes";
import { session } from "@web/common/classes/Session";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";

export const CompassApi = axios.create({
  baseURL: ENV_WEB.API_BASEURL,
});

type SignoutStatus = Status.UNAUTHORIZED | Status.NOT_FOUND | Status.GONE;
const _signOut = async (status: SignoutStatus) => {
  // since there are currently duplicate event fetches,
  // this prevents triggering a separate alert for each fetch
  // this can be removed once we have logic to cancel subsequent requests
  // after one failed
  if (status !== Status.UNAUTHORIZED) {
    alert("Login required, cuz security 😇");
  }

  await session.signOut();

  if (window.location.pathname.startsWith(ROOT_ROUTES.DAY)) {
    return;
  }
  window.location.assign(ROOT_ROUTES.DAY);
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

    const isUserNotFound =
      status === Status.NOT_FOUND && requestUrl?.includes("/user/profile");
    if (isUserNotFound) {
      window.location.assign(ROOT_ROUTES.ONBOARDING);
      return Promise.reject(error);
    }

    if (status === Status.GONE || status === Status.NOT_FOUND) {
      await _signOut(status);
    } else {
      console.error(error);
    }

    return Promise.reject(error);
  },
);
