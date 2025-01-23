import {
  Result_Auth_Compass,
  Result_VerifyGToken,
} from "@core/types/auth.types";

import { CompassApi } from "./compass.api";

const AuthApi = {
  async loginOrSignup(code: string) {
    const response = await CompassApi.post(`/oauth/google`, { code });
    return response.data as Result_Auth_Compass;
  },
  async validateGoogleAccessToken() {
    try {
      const res = await CompassApi.get(`/auth/google`);

      if (res.status !== 200) return false;

      const body = res.data as Result_VerifyGToken;
      return !!body.isValid;
    } catch (error) {
      console.error(error);
      return false;
    }
  },
};

export { AuthApi };
