import {
  type GoogleAuthCodeRequest,
  type Result_Auth_Compass,
} from "@core/types/auth.types";
import {
  type ConnectionBeginRequest,
  type ConnectionBeginResponse,
  ConnectionBeginResponseSchema,
  type ConnectionRefreshResponse,
  ConnectionRefreshResponseSchema,
} from "@core/types/sync/connection.contracts";
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

  // Ask the backend for the provider consent URL the browser should navigate
  // to (the sync service owns the OAuth round-trip). Pass `connectionId` to
  // reconnect an existing connection; omit it for a fresh one.
  async beginGoogleConnection(
    request: ConnectionBeginRequest = {},
  ): Promise<ConnectionBeginResponse> {
    const response = await BaseApi.post<ConnectionBeginResponse>(
      `/auth/google/connect/begin`,
      request,
    );

    return ConnectionBeginResponseSchema.parse(response.data);
  },

  // Enqueue Sync catch-up pulls for the signed-in user's calendars.
  async refreshGoogleSync(): Promise<ConnectionRefreshResponse> {
    const response = await BaseApi.post<ConnectionRefreshResponse>(
      `/auth/google/sync/refresh`,
      {},
    );

    return ConnectionRefreshResponseSchema.parse(response.data);
  },
};

export { AuthApi };
