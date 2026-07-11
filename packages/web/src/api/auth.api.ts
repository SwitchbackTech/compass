import {
  type GoogleAuthCodeRequest,
  type GoogleConnectResponse,
  type Result_Auth_Compass,
} from "@core/types/auth.types";
import { type ApiMethodConfig } from "@web/api/api.types";
import { BaseApi } from "@web/api/base/base.api";

const AuthApi = {
  async loginOrSignup(
    data: GoogleAuthCodeRequest,
  ): Promise<Result_Auth_Compass> {
    const response = await BaseApi.post<Result_Auth_Compass>(
      `/signinup`,
      data,
      { headers: { rid: "thirdparty" } },
    );

    return response.data;
  },

  async connectGoogle(
    data: GoogleAuthCodeRequest,
    config?: ApiMethodConfig,
  ): Promise<GoogleConnectResponse> {
    const response = await BaseApi.post<GoogleConnectResponse>(
      `/auth/google/connect`,
      data,
      config,
    );

    return response.data;
  },
};

export { AuthApi };
