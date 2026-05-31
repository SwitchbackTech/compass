import { GOOGLE_REVOKED } from "@core/constants/sse.constants";
import { Status } from "@core/errors/status.codes";
import {
  type GoogleAuthCodeRequest,
  type GoogleConnectResponse,
} from "@core/types/auth.types";
import { type ApiError, type ApiResponse } from "@web/common/apis/api.types";
import { AuthApi } from "@web/common/apis/auth.api";
import { sendApiRequestWithoutSharedErrorRecovery } from "@web/common/apis/base/base.api";
import {
  getApiErrorCode,
  handleErrorResponse,
  isApiError,
} from "@web/common/apis/util/api.util";
import { type GoogleAuthorizationAuthAdapter } from "./complete-google-authorization";

const isRecoverableConnectSessionError = (error: ApiError): boolean => {
  return (
    error.response?.status === Status.UNAUTHORIZED &&
    getApiErrorCode(error) !== GOOGLE_REVOKED
  );
};

export const GoogleAuthCallbackApi = {
  async connectGoogle(
    data: GoogleAuthCodeRequest,
  ): Promise<GoogleConnectResponse> {
    try {
      const response =
        await sendApiRequestWithoutSharedErrorRecovery<GoogleConnectResponse>(
          "POST",
          "/auth/google/connect",
          data,
        );

      return response.data;
    } catch (error) {
      if (!isApiError(error)) {
        throw error;
      }

      if (isRecoverableConnectSessionError(error)) {
        throw error;
      }

      await handleErrorResponse<ApiResponse<GoogleConnectResponse>>(error);
      throw error;
    }
  },
  loginOrSignup: AuthApi.loginOrSignup,
} satisfies GoogleAuthorizationAuthAdapter;
