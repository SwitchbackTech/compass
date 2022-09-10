import axios from "axios";
import Session from "supertokens-auth-react/recipe/session";
import { ENV_WEB } from "@web/common/constants/env.constants";

export const CompassApi = axios.create({
  baseURL: ENV_WEB.API_BASEURL,
});

Session.addAxiosInterceptors(CompassApi);
