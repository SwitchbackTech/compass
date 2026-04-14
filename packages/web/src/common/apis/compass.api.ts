import { GOOGLE_REVOKED } from "@core/constants/sse.constants";
import { Status } from "@core/errors/status.codes";
import { session } from "@web/common/classes/Session";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  assignLocation,
  reloadLocation,
} from "@web/common/utils/browser/browser-navigation.util";
import { showSessionExpiredToast } from "@web/common/utils/toast/error-toast.util";
import { handleGoogleRevoked } from "../../auth/google/util/google.auth.util";
import { getApiErrorCode } from "./compass.api.util";

export interface ApiRequestConfig {
  headers?: HeadersInit;
  method?: string;
  url?: string;
}

export interface ApiResponse<T> {
  config: ApiRequestConfig;
  data: T;
  headers: Headers;
  status: number;
  statusText: string;
}

export interface ApiError extends Error {
  config?: ApiRequestConfig;
  response?: ApiResponse<unknown>;
}

type ApiAdapter = <T>(
  config: ApiRequestConfig & { body?: unknown },
) => Promise<ApiResponse<T>>;

type ApiMethodConfig = Pick<ApiRequestConfig, "headers">;
type SignoutStatus = Status.UNAUTHORIZED | Status.NOT_FOUND | Status.GONE;

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

const createApiError = (
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

const getRequestUrl = (url: string): string => {
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  return `${ENV_WEB.API_BASEURL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
};

const getResponseData = async (response: Response): Promise<unknown> => {
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

const handleErrorResponse = async <T>(error: ApiError) => {
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

export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === "object" &&
    error !== null &&
    ("config" in error || "response" in error)
  );
};

const request = async <T>(
  method: string,
  url: string,
  body?: unknown,
  config: ApiMethodConfig = {},
): Promise<ApiResponse<T>> => {
  const requestConfig = {
    headers: config.headers,
    method,
    url,
  } satisfies ApiRequestConfig;

  try {
    if (CompassApi.defaults.adapter) {
      return await CompassApi.defaults.adapter<T>({
        ...requestConfig,
        body,
      });
    }

    const response = await fetch(getRequestUrl(url), {
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      headers: {
        ...DEFAULT_HEADERS,
        ...config.headers,
      },
      method,
    });
    const data = await getResponseData(response);
    const result = {
      config: requestConfig,
      data: data as T,
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    } satisfies ApiResponse<T>;

    if (!response.ok) {
      throw createApiError(requestConfig, result as ApiResponse<unknown>);
    }

    return result;
  } catch (error) {
    if (isApiError(error)) {
      return handleErrorResponse<ApiResponse<T>>(error);
    }

    throw createApiError(requestConfig);
  }
};

const signOut = async (status: SignoutStatus) => {
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

export const CompassApi = {
  defaults: {
    adapter: undefined as ApiAdapter | undefined,
    withCredentials: true,
  },
  delete<T>(url: string, config?: ApiMethodConfig) {
    return request<T>("DELETE", url, undefined, config);
  },
  get<T>(url: string, config?: ApiMethodConfig) {
    return request<T>("GET", url, undefined, config);
  },
  post<T>(url: string, body?: unknown, config?: ApiMethodConfig) {
    return request<T>("POST", url, body, config);
  },
  put<T>(url: string, body?: unknown, config?: ApiMethodConfig) {
    return request<T>("PUT", url, body, config);
  },
};
