import { type Status } from "@core/errors/status.codes";

export type ApiAdapter = <T>(
  config: ApiRequestConfig & { body?: unknown },
) => Promise<ApiResponse<T>>;

export interface ApiError extends Error {
  config?: ApiRequestConfig;
  response?: ApiResponse<unknown>;
}

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

export type ApiMethodConfig = Pick<ApiRequestConfig, "headers">;

export type SignoutStatus =
  | Status.UNAUTHORIZED
  | Status.NOT_FOUND
  | Status.GONE;
