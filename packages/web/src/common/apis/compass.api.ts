import axios from "axios";
import Session from "supertokens-auth-react/recipe/session";
import { ENV_WEB } from "@web/common/constants/env.constants";

export const CompassApi = axios.create({
  baseURL: ENV_WEB.API_BASEURL,
  // baseURL: "http://localhost:3000/api",
});

Session.addAxiosInterceptors(CompassApi);
