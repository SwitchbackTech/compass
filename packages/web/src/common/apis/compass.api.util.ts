import type { AxiosError } from "axios";

/**
 * Extracts the error code from an Axios error's response data.
 * Returns undefined when the response has no object body with a string `code` property.
 */
export const getApiErrorCode = (error: AxiosError): string | undefined => {
  const data = error?.response?.data;
  if (!data || typeof data !== "object" || !("code" in data)) return undefined;
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

/**
 * Returns a rejected promise while marking the rejection as handled.
 * This prevents expected control-flow rejections (like auth sign-out)
 * from being reported as unhandled promise rejections.
 */
export const createHandledRejection = <T>(error: unknown): Promise<T> => {
  const rejectedPromise = Promise.reject(error) as Promise<T>;
  void rejectedPromise.catch(() => undefined);
  return rejectedPromise;
};
