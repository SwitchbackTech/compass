import { Result_Auth_Compass } from "@core/types/auth.types";

import { CompassApi } from "./compass.api";

const AuthApi = {
  async loginOrSignup(code: string) {
    const response = await CompassApi.post(
      `/oauth/google`,
      { code }
      // { timeout: 1000 }
    );
    return response.data as Result_Auth_Compass;
  },
};

export { AuthApi };
