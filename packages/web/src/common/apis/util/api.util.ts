import { type ZodType } from "zod";
import { GOOGLE_REVOKED } from "@core/constants/sse.constants";
import { Status } from "@core/errors/status.codes";
import {
  type GoogleConnectErrorResponse,
  GoogleConnectErrorResponseSchema,
} from "@core/types/auth.types";
import { handleGoogleRevoked } from "@web/auth/google/util/google.auth.util";
import { session } from "@web/common/classes/Session";
import { ENV_WEB } from "../../constants/env.constants";
import { ROOT_ROUTES } from "../../constants/routes";
import {
  assignLocation,
  reloadLocation,
} from "../../utils/browser/browser-navigation.util";
import { showSessionExpiredToast } from "../../utils/toast/error-toast.util";
import {
  type ApiError,
  type ApiRequestConfig,
  type ApiResponse,
  type SignoutStatus,
} from "../api.types";

export const createApiError = (
  config: ApiRequestConfig,
  response?: ApiResponse<unknown>,
): ApiError => {
  const error = new Error(
    `Request failed${response ? ` with status ${response.status}` : ""}`,
  ) as ApiError;
  error.config = config;
  error.name = "ApiError";
  error.response = response;
  return error;
};

const getApiErrorData = (error: ApiError): unknown => {
  return error?.response?.data;
};

export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === "object" &&
    error !== null &&
    ("config" in error || "response" in error)
  );
};

/**
 * Extracts the error code from an API error's response data.
 * Returns undefined when the response has no object body with a string `code` property.
 */
export const getApiErrorCode = (error: ApiError): string | undefined => {
  const data = getApiErrorData(error);
  if (!data || typeof data !== "object" || !("code" in data)) return undefined;
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

export const parseApiError = <T>(
  error: ApiError,
  schema: ZodType<T>,
): T | undefined => {
  const parsed = schema.safeParse(getApiErrorData(error));
  return parsed.success ? parsed.data : undefined;
};

export const parseGoogleConnectError = (
  error: ApiError,
): GoogleConnectErrorResponse | undefined => {
  return parseApiError(error, GoogleConnectErrorResponseSchema);
};

export const signOut = async (status: SignoutStatus) => {
  // since there are currently duplicate event fetches,
  // this prevents triggering a separate alert for each fetch
  // this can be removed once we have logic to cancel subsequent requests
  // after one failed
  if (status === Status.UNAUTHORIZED) {
    showSessionExpiredToast();
  } else {
    alert("Login required, cuz security 😇");
  }

  await session.signOut();

  if (window.location.pathname.startsWith(ROOT_ROUTES.DAY)) {
    return;
  }
  assignLocation(ROOT_ROUTES.DAY);
};

export const getRequestUrl = (url: string): string => {
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  return `${ENV_WEB.API_BASEURL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
};

export const getResponseData = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const handleErrorResponse = async <T>(error: ApiError) => {
  const requestUrl = error.config?.url;
  const status = error.response?.status;

  if (status === Status.REDUX_REFRESH_NEEDED) {
    reloadLocation();
    return undefined as T;
  }

  const isUserProfileNotFound =
    status === Status.NOT_FOUND && requestUrl?.includes("/user/profile");
  if (isUserProfileNotFound) {
    throw error;
  }

  if (
    (status === Status.GONE || status === Status.UNAUTHORIZED) &&
    getApiErrorCode(error) === GOOGLE_REVOKED
  ) {
    handleGoogleRevoked();
    throw error;
  }

  const isAuthEndpoint = requestUrl?.includes("/signinup");

  if (
    !isAuthEndpoint &&
    (status === Status.GONE ||
      status === Status.NOT_FOUND ||
      status === Status.UNAUTHORIZED)
  ) {
    await signOut(status);
  } else if (!isAuthEndpoint) {
    console.error(error);
  }

  throw error;
};
