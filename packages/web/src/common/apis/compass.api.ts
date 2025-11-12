import axios, { AxiosError } from "axios";
import { signOut } from "supertokens-auth-react/recipe/session";
import { Status } from "@core/errors/status.codes";
import { AUTH_FAILURE_REASONS } from "@web/common/constants/auth.constants";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { ROOT_ROUTES } from "../constants/routes";

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

  await signOut();

  if (window.location.pathname === ROOT_ROUTES.LOGIN) {
    return;
  }

  const searchParams = new URLSearchParams({
    reason:
      status === Status.NOT_FOUND || status === Status.GONE
        ? AUTH_FAILURE_REASONS.GAUTH_SESSION_EXPIRED
        : AUTH_FAILURE_REASONS.USER_SESSION_EXPIRED,
  });

  window.location.assign(`${ROOT_ROUTES.LOGIN}?${searchParams.toString()}`);
};

CompassApi.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const status = error?.response?.status;

    if (status === Status.REDUX_REFRESH_NEEDED) {
      window.location.reload();
      return Promise.resolve();
    }

    if (status === Status.GONE || status === Status.NOT_FOUND) {
      await _signOut(status);
    } else {
      console.error(error);
    }

    return Promise.reject(error);
  },
);
