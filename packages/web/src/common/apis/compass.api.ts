import axios, { AxiosError } from "axios";
import { signOut } from "supertokens-auth-react/recipe/session";
import { Status } from "@core/errors/status.codes";
import { ENV_WEB } from "@web/common/constants/env.constants";

import { ROOT_ROUTES } from "../constants/routes";

const LOGIN_REQUIRED_MSG = "Login required, cuz security 😇";

export const CompassApi = axios.create({
  baseURL: ENV_WEB.API_BASEURL,
});

const _signOut = async (msg: string) => {
  alert(msg);
  await signOut();
  window.location = ROOT_ROUTES.LOGIN;
  window.location.reload();
};

CompassApi.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const status = error?.response?.status;

    if (status === Status.UNAUTHORIZED) {
      alert(LOGIN_REQUIRED_MSG);
      return Promise.reject(error);
    }

    if (status === Status.GONE || status === Status.REDUX_REFRESH_NEEDED) {
      await _signOut(LOGIN_REQUIRED_MSG);
    } else {
      alert("Hmm, something's off.");
      console.log(error);
      return Promise.reject(error);
    }
  }
);
