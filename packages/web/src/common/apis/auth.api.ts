import axios from "axios";

import {
  API_BASEURL,
  GOOGLE,
  LocalStorage,
} from "@web/common/constants/web.constants";
import { Result_OauthStatus } from "@core/types/auth.types";

const headers = {
  // TODO replace with method in helpers
  headers: {
    Authorization: `Bearer ${localStorage.getItem(LocalStorage.TOKEN)}`,
  },
};

const AuthApi = {
  async checkOauthStatus() {
    const authState = localStorage.getItem(LocalStorage.AUTHSTATE);
    const url = `${API_BASEURL}/auth/oauth-status?integration=${GOOGLE}&state=${authState}`;
    const response = await axios.get(url);
    return response.data as Result_OauthStatus;
  },

  async getOauthData(integration: string) {
    if (integration === GOOGLE) {
      const response = await axios.get(
        `${API_BASEURL}/auth/oauth-url?integration=${GOOGLE}`
      );
      return response.data;
    }
    return { e: `${integration}not supported` };
  },

  async refresh() {
    try {
      const response = await axios.post(
        `${API_BASEURL}/auth/refresh-token`,
        {},
        headers
      );
      return response.data;
    } catch (err) {
      console.log("err while refreshing token:", err);
      return false;
    }
  },
};

export { AuthApi };
