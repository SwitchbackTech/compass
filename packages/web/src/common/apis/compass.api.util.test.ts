import type {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { getApiErrorCode } from "./compass.api.util";

const createAxiosError = (response: { data?: unknown } | null): AxiosError =>
  ({
    response: response
      ? ({
          data: response.data,
          config: {} as InternalAxiosRequestConfig,
          headers: {},
          status: 400,
          statusText: "Error",
        } as AxiosResponse)
      : undefined,
  }) as AxiosError;

describe("getApiErrorCode", () => {
  it("returns the code when response.data has a string code property", () => {
    const error = createAxiosError({ data: { code: "GOOGLE_REVOKED" } });
    expect(getApiErrorCode(error)).toBe("GOOGLE_REVOKED");
  });

  it("returns the code for arbitrary error codes", () => {
    const error = createAxiosError({ data: { code: "FULL_SYNC_REQUIRED" } });
    expect(getApiErrorCode(error)).toBe("FULL_SYNC_REQUIRED");
  });

  it("returns undefined when error has no response", () => {
    const error = createAxiosError(null);
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when response has no data", () => {
    const error = createAxiosError({ data: undefined });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when data is not an object", () => {
    const error = createAxiosError({ data: "string body" });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when data is an array", () => {
    const error = createAxiosError({ data: [] });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when data has no code property", () => {
    const error = createAxiosError({
      data: { message: "Something went wrong" },
    });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when code is not a string", () => {
    const error = createAxiosError({ data: { code: 404 } });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("returns undefined when code is null", () => {
    const error = createAxiosError({ data: { code: null } });
    expect(getApiErrorCode(error)).toBeUndefined();
  });

  it("preserves message when data has both code and message", () => {
    const error = createAxiosError({
      data: { code: "GOOGLE_REVOKED", message: "Google access revoked." },
    });
    expect(getApiErrorCode(error)).toBe("GOOGLE_REVOKED");
  });
});
