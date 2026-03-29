import {
  type GoogleAuthCodeRequest,
  type GoogleConnectResponse,
  type Result_Auth_Compass,
} from "@core/types/auth.types";
import { type GoogleAuthConfig } from "@web/auth/hooks/google/googe.auth.types";
import { CompassApi } from "@web/common/apis/compass.api";

const AuthApi = {
  async loginOrSignup(data: GoogleAuthConfig): Promise<Result_Auth_Compass> {
    const response = await CompassApi.post<Result_Auth_Compass>(
      `/signinup`,
      data,
      { headers: { rid: "thirdparty" } },
    );

    return response.data;
  },

  async connectGoogle(
    data: GoogleAuthCodeRequest,
  ): Promise<GoogleConnectResponse> {
    const response = await CompassApi.post<GoogleConnectResponse>(
      `/auth/google/connect`,
      data,
    );

    return response.data;
  },
};

export { AuthApi };
