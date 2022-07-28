import axios from "axios";
import Session from "supertokens-auth-react/recipe/session";
import { API_BASEURL } from "@web/common/constants/web.constants";

export const CompassApi = axios.create({
  baseURL: API_BASEURL,
});

Session.addAxiosInterceptors(CompassApi);
