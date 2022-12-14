import axios from "axios";
import Session, { signOut } from "supertokens-auth-react/recipe/session";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { Status } from "@core/errors/status.codes";

import { ROOT_ROUTES } from "../constants/routes";

export const CompassApi = axios.create({
  baseURL: ENV_WEB.API_BASEURL,
});

CompassApi.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: Error) => {
    if (error.response.status === Status.GONE) {
      alert("Signing out, cuz you revoked access to Compass");
      await signOut();
      window.location = `#${ROOT_ROUTES.LOGIN}`;
    }
    return Promise.reject(error);
  }
);

Session.addAxiosInterceptors(CompassApi);
