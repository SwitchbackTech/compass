import {
  type GoogleAuthCodeRequest,
  type GoogleConnectResponse,
  type Result_Auth_Compass,
} from "@core/types/auth.types";
import {
  type ConnectionBeginResponse,
  ConnectionBeginResponseSchema,
} from "@core/types/sync/connection.contracts";
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

  // Sync-delegated connect: ask the backend for the provider consent URL the
  // browser should navigate to (the redirect flow). Only meaningful where the
  // deployment delegates connections to the sync service; the legacy flow uses
  // connectGoogle above. `connectionId` is omitted for a fresh connection.
  async beginGoogleConnection(): Promise<ConnectionBeginResponse> {
    const response = await BaseApi.post<ConnectionBeginResponse>(
      `/auth/google/connect/begin`,
      {},
    );

    return ConnectionBeginResponseSchema.parse(response.data);
  },
};

export { AuthApi };
