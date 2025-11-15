import { Result_Auth_Compass } from "@core/types/auth.types";
import { CompassApi } from "@web/common/apis/compass.api";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

const AuthApi = {
  async loginOrSignup(data: SignInUpInput): Promise<Result_Auth_Compass> {
    const response = await CompassApi.post<Result_Auth_Compass>(
      `/signinup`,
      data,
    );

    return response.data;
  },
};

export { AuthApi };
