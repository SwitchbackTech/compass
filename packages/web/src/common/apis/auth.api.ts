import axios from "axios";
import {
  Result_OauthStatus,
  Result_OauthUrl,
  Result_TokenRefresh,
} from "@core/types/auth.types";
import {
  API_BASEURL,
  GOOGLE,
  LocalStorage,
} from "@web/common/constants/web.constants";

const headers = {
  // TODO replace with method in helpers
  headers: {
    Authorization: `Bearer ${localStorage.getItem(LocalStorage.TOKEN)}`,
  },
};

const AuthApi = {
  async checkOauthStatus(authState: string) {
    const url = `${API_BASEURL}/auth/oauth-status?integration=${GOOGLE}&state=${authState}`;
    const response = await axios.get(url);
    return response.data as Result_OauthStatus;
  },

  async getOauthData(integration: string) {
    if (integration === GOOGLE) {
      const response = await axios.get(
        `${API_BASEURL}/auth/oauth-url?integration=${GOOGLE}`
      );
      return response.data as Result_OauthUrl;
    }
  },

  /*
      // $$ move this elsewhere?
      // shouldn't need to check for refreshing, cuz
      // there isn't a token yet - right?
      if (status.refreshNeeded) {
        console.log("$$ temp: refreshing token");
        const newStatus = await AuthApi.refreshToken();
        if (newStatus.error) {
          alert(newStatus.error);
          // $$ give up, send back to login screen to break out of loop (?)
          return;
        }
        token = newStatus.token;
      }
      */
  async refreshToken() {
    try {
      const response = await axios.post(
        `${API_BASEURL}/auth/refresh-token`,
        {},
        headers
      );
      return response.data as Result_TokenRefresh;
    } catch (err) {
      return { token: null, error: JSON.stringify(err) };
    }
  },
};

export { AuthApi };
