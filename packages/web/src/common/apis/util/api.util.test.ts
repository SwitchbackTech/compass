import { ApiErrorResponseSchema } from "@core/types/auth.types";
import { type ApiError, type ApiResponse } from "../api.types";
import { getApiErrorCode, parseApiError } from "./api.util";
import { describe, expect, it } from "bun:test";

const createApiError = (
  response: { data?: unknown; status?: number } | null,
): ApiError =>
  Object.assign(new Error("Request failed"), {
    response: response
      ? ({
          config: {},
          data: response.data,
          headers: new Headers(),
          status: response.status ?? 400,
          statusText: "Error",
        } as ApiResponse<unknown>)
      : undefined,
  });

describe("getApiErrorCode", () => {
  it("returns the code when response.data has a string code property", () => {
    const error = createApiError({ data: { code: "GOOGLE_REVOKED" } });
    expect(getApiErrorCode(error)).toBe("GOOGLE_REVOKED");
  });

  it("returns the code for arbitrary error codes", () => {
    const error = createApiError({ data: { code: "FULL_SYNC_REQUIRED" } });
    expect(getApiErrorCode(error)).toBe("FULL_SYNC_REQUIRED");
  });

  it("returns undefined when error has no response", () => {
    const error = createApiError(null);
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when response has no data", () => {
    const error = createApiError({ data: undefined });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when data is not an object", () => {
    const error = createApiError({ data: "string body" });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when data is an array", () => {
    const error = createApiError({ data: [] });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when data has no code property", () => {
    const error = createApiError({
      data: { message: "Something went wrong" },
    });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when code is not a string", () => {
    const error = createApiError({ data: { code: 404 } });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when code is null", () => {
    const error = createApiError({ data: { code: null } });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("preserves message when data has both code and message", () => {
    const error = createApiError({
      data: { code: "GOOGLE_REVOKED", message: "Google access revoked." },
    });
    expect(getApiErrorCode(error)).toBe("GOOGLE_REVOKED");
  });
});

describe("parseApiError", () => {
  it("parses errors against a provided schema", () => {
    const error = createApiError({
      data: {
        code: "ANY_ERROR",
        message: "Something went wrong",
      },
    });

    expect(parseApiError(error, ApiErrorResponseSchema)).toEqual({
      code: "ANY_ERROR",
      message: "Something went wrong",
    });
  });

  it("returns undefined when the payload does not match the schema", () => {
    const error = createApiError({
      data: { code: 404, message: "Something went wrong" },
    });

    expect(parseApiError(error, ApiErrorResponseSchema)).toBeUndefined();
  });
});
