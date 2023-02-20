import axios, { AxiosError } from "axios";
import { signOut } from "supertokens-auth-react/recipe/session";
import { Status } from "@core/errors/status.codes";
import { ENV_WEB } from "@web/common/constants/env.constants";

import { ROOT_ROUTES } from "../constants/routes";

export const CompassApi = axios.create({
  baseURL: ENV_WEB.API_BASEURL,
});

const _signOut = async (msg: string) => {
  alert(msg);
  await signOut();
  window.location = `#${ROOT_ROUTES.LOGIN}`;
  window.location.reload();
};

CompassApi.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const status = error?.response?.status;

    if (status === Status.UNAUTHORIZED) {
      return Promise.reject(error);
    }

    if (status !== Status.UNAUTHORIZED) {
      // supertokens handles these
      if (status === Status.GONE) {
        await _signOut("Signing out, cuz you revoked access to Compass ✌");
      } else if (status === Status.REDUX_REFRESH_NEEDED) {
        await _signOut("Login required, cuz security 😇");
      } else {
        alert("Something broke. Please let Tyler know: tyler@switchback.tech");
        console.log(error);
        return Promise.reject(error);
      }
    }
  }
);
