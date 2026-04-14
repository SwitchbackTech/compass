import {
  type ApiAdapter,
  type ApiMethodConfig,
  type ApiRequestConfig,
  type ApiResponse,
} from "../api.types";
import {
  createApiError,
  getRequestUrl,
  getResponseData,
  handleErrorResponse,
  isApiError,
} from "../util/api.util";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
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
    if (BaseApi.defaults.adapter) {
      return await BaseApi.defaults.adapter<T>({
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

export const BaseApi = {
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
