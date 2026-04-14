import type { ZodType } from "zod";
import {
  type GoogleConnectErrorResponse,
  GoogleConnectErrorResponseSchema,
} from "@core/types/auth.types";
import { type ApiError } from "./compass.api";

const getApiErrorData = (error: ApiError): unknown => {
  return error?.response?.data;
};

export const parseApiError = <T>(
  error: ApiError,
  schema: ZodType<T>,
): T | undefined => {
  const parsed = schema.safeParse(getApiErrorData(error));
  return parsed.success ? parsed.data : undefined;
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

export const parseGoogleConnectError = (
  error: ApiError,
): GoogleConnectErrorResponse | undefined => {
  return parseApiError(error, GoogleConnectErrorResponseSchema);
};
