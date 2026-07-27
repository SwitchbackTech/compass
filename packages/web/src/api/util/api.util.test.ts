import { Status } from "@core/errors/status.codes";
import {
  ApiErrorResponseSchema,
  GoogleConnectErrorResponseSchema,
} from "@core/types/auth.types";
import { session } from "@web/auth/compass/session/Session";
import {
  type ApiError,
  type ApiRequestConfig,
  type ApiResponse,
} from "../api.types";
import {
  getApiErrorCode,
  handleErrorResponse,
  parseApiError,
  parseGoogleConnectError,
} from "./api.util";
import { describe, expect, it, mock, spyOn } from "bun:test";

const createApiError = (
  response: { data?: unknown; status?: number } | null,
  config: ApiRequestConfig = {},
): ApiError =>
  Object.assign(new Error("Request failed"), {
    config,
    response: response
      ? ({
          config,
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

describe("parseGoogleConnectError", () => {
  it("parses typed Google connect errors", () => {
    const error = createApiError({
      data: {
        code: "GOOGLE_ACCOUNT_ALREADY_CONNECTED",
        message: "Google account is already connected",
      },
    });

    expect(parseGoogleConnectError(error)).toEqual({
      code: "GOOGLE_ACCOUNT_ALREADY_CONNECTED",
      message: "Google account is already connected",
    });
  });

  it("parses Google not configured connect errors", () => {
    const error = createApiError({
      data: {
        code: "GOOGLE_NOT_CONFIGURED",
        message: "Google is not configured for this Compass instance",
      },
    });

    expect(parseGoogleConnectError(error)).toEqual({
      code: "GOOGLE_NOT_CONFIGURED",
      message: "Google is not configured for this Compass instance",
    });
  });

  it("returns undefined for non-Google-connect error codes", () => {
    const error = createApiError({
      data: {
        code: "ANY_ERROR",
        message: "Something went wrong",
      },
    });

    expect(parseGoogleConnectError(error)).toBeUndefined();
    expect(
      parseApiError(error, GoogleConnectErrorResponseSchema),
    ).toBeUndefined();
  });
});

describe("handleErrorResponse", () => {
  it.each([
    Status.UNAUTHORIZED,
    Status.GONE,
  ])("delegates Google revocation for status %s and rethrows the API error", async (status) => {
    const onGoogleRevoked = mock();
    const error = createApiError({
      data: { code: "GOOGLE_REVOKED" },
      status,
    });

    await expect(handleErrorResponse(error, { onGoogleRevoked })).rejects.toBe(
      error,
    );

    expect(onGoogleRevoked).toHaveBeenCalledTimes(1);
  });

  it("delegates Google revocation for the full event-mutation envelope body", async () => {
    // Sync-delegated writes now return the same GOOGLE_REVOKED code inside the
    // EventMutationError envelope (message + retryable). The gate keys only on
    // code, so the richer body must still fire reconnect.
    const onGoogleRevoked = mock();
    const error = createApiError({
      data: {
        code: "GOOGLE_REVOKED",
        message:
          "Google Calendar access expired or was revoked. Reconnect Google Calendar in Compass to resume syncing.",
        retryable: false,
      },
      status: Status.UNAUTHORIZED,
    });

    await expect(handleErrorResponse(error, { onGoogleRevoked })).rejects.toBe(
      error,
    );

    expect(onGoogleRevoked).toHaveBeenCalledTimes(1);
  });

  it("does not delegate unrelated API errors", async () => {
    const onGoogleRevoked = mock();
    const error = createApiError(
      { data: { code: "SOMETHING_ELSE" }, status: Status.GONE },
      { url: "/signinup" },
    );

    await expect(handleErrorResponse(error, { onGoogleRevoked })).rejects.toBe(
      error,
    );

    expect(onGoogleRevoked).not.toHaveBeenCalled();
  });

  it("fails clearly when the Google revocation handler is not configured", async () => {
    const error = createApiError({
      data: { code: "GOOGLE_REVOKED" },
      status: Status.UNAUTHORIZED,
    });

    await expect(
      handleErrorResponse(error, { onGoogleRevoked: undefined }),
    ).rejects.toThrow("Google revocation handler is not configured");
  });

  it("does not sign the user out on a 404 from a data endpoint", async () => {
    window.history.pushState({}, "", "/day");
    const signOutSpy = spyOn(session, "signOut").mockResolvedValue(undefined);
    const error = createApiError(
      { status: Status.NOT_FOUND },
      { url: "/event" },
    );

    // A missing resource (e.g. syncing an event onto a not-yet-provisioned
    // calendar) rethrows for the caller to handle - it must not eject the user.
    await expect(
      handleErrorResponse(error, { onGoogleRevoked: undefined }),
    ).rejects.toBe(error);

    expect(signOutSpy).not.toHaveBeenCalled();
    signOutSpy.mockRestore();
  });

  it("still signs the user out on an unauthorized data-endpoint response", async () => {
    // Already on the calendar route, so signOut skips the (jsdom-unsupported)
    // navigation and we can assert purely on the sign-out call.
    window.history.pushState({}, "", "/week");
    const signOutSpy = spyOn(session, "signOut").mockResolvedValue(undefined);
    const error = createApiError(
      { status: Status.UNAUTHORIZED },
      { url: "/event" },
    );

    await expect(
      handleErrorResponse(error, { onGoogleRevoked: undefined }),
    ).rejects.toBe(error);

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    signOutSpy.mockRestore();
  });
});
