import type { AxiosError } from "axios";
import { GoogleConnectErrorResponseSchema } from "@core/types/auth.types";

const getApiErrorData = (error: AxiosError): unknown => {
  return error?.response?.data;
};

/**
 * Extracts the error code from an Axios error's response data.
 * Returns undefined when the response has no object body with a string `code` property.
 */
export const getApiErrorCode = (error: AxiosError): string | undefined => {
  const data = getApiErrorData(error);
  if (!data || typeof data !== "object" || !("code" in data)) return undefined;
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

export const getApiErrorMessage = (error: AxiosError): string | undefined => {
  const parsed = GoogleConnectErrorResponseSchema.safeParse(
    getApiErrorData(error),
  );
  return parsed.success ? parsed.data.message : undefined;
};
