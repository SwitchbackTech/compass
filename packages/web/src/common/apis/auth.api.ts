import axios from "axios";
import { Result_Auth_Compass } from "@core/types/auth.types";
import { API_BASEURL } from "@web/common/constants/web.constants";
import Session from "supertokens-auth-react/recipe/session";
Session.addAxiosInterceptors(axios);

const AuthApi = {
  async loginOrSignup(code: string) {
    try {
      const url = `${API_BASEURL}/oauth/google`;
      const response = await axios.post(url, { code });
      return response.data as Result_Auth_Compass;
    } catch (e: unknown) {
      return e as Error;
    }
  },
};

export { AuthApi };

/* OLD OAUTH STUFF

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
*/
