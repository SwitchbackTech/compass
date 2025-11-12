import { Result_Auth_Compass } from "@core/types/auth.types";
import { CompassApi } from "@web/common/apis/compass.api";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

const AuthApi = {
  async loginOrSignup(data: SignInUpInput) {
    const response = await CompassApi.post(`/signinup`, data);
    return response.data as Result_Auth_Compass;
  },
};

export { AuthApi };
