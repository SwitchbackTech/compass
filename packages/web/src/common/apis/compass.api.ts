import axios from "axios";
import Session, { signOut } from "supertokens-auth-react/recipe/session";
import { ENV_WEB } from "@web/common/constants/env.constants";

import { ROOT_ROUTES } from "../constants/routes";

export const CompassApi = axios.create({
  baseURL: ENV_WEB.API_BASEURL,
});

CompassApi.interceptors.response.use(
  function (response) {
    return response;
  },
  async function (error) {
    console.log(error);
    if (error.response.status === 410) {
      await signOut();
      alert("Signing out, cuz you revoked access to Compass");
      window.location = `#${ROOT_ROUTES.LOGIN}`;
    }

    // supertokens handles 401 error
    // access via: error.messag.slice(-3)
    return Promise.reject(error);
  }
);

Session.addAxiosInterceptors(CompassApi);
