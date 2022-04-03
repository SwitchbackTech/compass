import axios from "axios";
import { Result_OauthStatus, Result_OauthUrl } from "@core/types/auth.types";
import { API_BASEURL, GOOGLE } from "@web/common/constants/web.constants";

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
};

export { AuthApi };
