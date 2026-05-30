import { Status } from "@core/errors/status.codes";
import { completeGoogleAuthorization } from "./complete-google-authorization";
import { GOOGLE_AUTH_SCOPES_REQUIRED } from "./google-authorization.constants";
import {
  readGoogleAuthorizationIntent,
  writeGoogleAuthorizationIntent,
} from "./google-authorization.storage";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const makeDeps = () => ({
  authApi: {
    loginOrSignup: mock(async () => ({
      createdNewRecipeUser: false,
      status: "OK" as const,
      user: { emails: ["user@example.com"] },
    })),
    connectGoogle: mock(async () => ({ status: "OK" as const })),
  },
  completeAuthentication: mock(async () => undefined),
  refreshUserMetadata: mock(async () => undefined),
  requestEventFetch: mock(() => undefined),
});

const callbackSearch = (
  state: string,
  scope = GOOGLE_AUTH_SCOPES_REQUIRED.join(" "),
) =>
  `?state=${encodeURIComponent(
    state,
  )}&code=auth-code&scope=${encodeURIComponent(scope)}`;

describe("completeGoogleAuthorization", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("completes a saved Google sign-in intent", async () => {
    const deps = makeDeps();
    writeGoogleAuthorizationIntent("state-1", {
      intent: "signIn",
      returnPath: "/week",
      createdAt: Date.now(),
    });

    await expect(
      completeGoogleAuthorization({
        ...deps,
        search: callbackSearch("state-1"),
      }),
    ).resolves.toEqual({ status: "completed", returnPath: "/week" });

    expect(deps.authApi.loginOrSignup).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectURIInfo: expect.objectContaining({
          redirectURIQueryParams: expect.objectContaining({
            code: "auth-code",
            state: "state-1",
          }),
        }),
      }),
    );
    expect(deps.completeAuthentication).toHaveBeenCalledWith({
      email: "user@example.com",
    });
    expect(deps.authApi.connectGoogle).not.toHaveBeenCalled();
    expect(readGoogleAuthorizationIntent("state-1")).toBeNull();
  });

  it("completes a saved Google Calendar connect intent", async () => {
    const deps = makeDeps();
    writeGoogleAuthorizationIntent("state-2", {
      intent: "connectCalendar",
      returnPath: "/day",
      createdAt: Date.now(),
    });

    await expect(
      completeGoogleAuthorization({
        ...deps,
        search: callbackSearch("state-2"),
      }),
    ).resolves.toEqual({ status: "completed", returnPath: "/day" });

    expect(deps.authApi.connectGoogle).toHaveBeenCalledTimes(1);
    expect(deps.refreshUserMetadata).toHaveBeenCalledTimes(1);
    expect(deps.requestEventFetch).toHaveBeenCalledTimes(1);
    expect(deps.completeAuthentication).not.toHaveBeenCalled();
  });

  it("uses Google sign-in recovery for a saved connect intent when the Compass session is missing", async () => {
    const deps = makeDeps();
    writeGoogleAuthorizationIntent("state-session-missing", {
      intent: "connectCalendar",
      returnPath: "/day",
      createdAt: Date.now(),
    });

    await expect(
      completeGoogleAuthorization({
        ...deps,
        doesSessionExist: mock(async () => false),
        search: callbackSearch("state-session-missing"),
      }),
    ).resolves.toEqual({ status: "completed", returnPath: "/day" });

    expect(deps.authApi.connectGoogle).not.toHaveBeenCalled();
    expect(deps.authApi.loginOrSignup).toHaveBeenCalledTimes(1);
    expect(deps.completeAuthentication).toHaveBeenCalledWith({
      email: "user@example.com",
    });
    expect(deps.refreshUserMetadata).not.toHaveBeenCalled();
    expect(deps.requestEventFetch).not.toHaveBeenCalled();
  });

  it("uses Google sign-in recovery when the connect endpoint rejects an expired Compass session", async () => {
    const deps = makeDeps();
    deps.authApi.connectGoogle.mockRejectedValue(
      Object.assign(new Error("Request failed with status 401"), {
        response: {
          data: { message: "unauthorised" },
          status: Status.UNAUTHORIZED,
        },
      }),
    );
    writeGoogleAuthorizationIntent("state-session-expired", {
      intent: "connectCalendar",
      returnPath: "/day",
      createdAt: Date.now(),
    });

    await expect(
      completeGoogleAuthorization({
        ...deps,
        search: callbackSearch("state-session-expired"),
      }),
    ).resolves.toEqual({ status: "completed", returnPath: "/day" });

    expect(deps.authApi.connectGoogle).toHaveBeenCalledTimes(1);
    expect(deps.authApi.loginOrSignup).toHaveBeenCalledTimes(1);
    expect(deps.completeAuthentication).toHaveBeenCalledWith({
      email: "user@example.com",
    });
    expect(deps.refreshUserMetadata).not.toHaveBeenCalled();
    expect(deps.requestEventFetch).not.toHaveBeenCalled();
  });

  it("rejects callbacks that are missing required Google Calendar scopes", async () => {
    const deps = makeDeps();
    writeGoogleAuthorizationIntent("state-3", {
      intent: "signIn",
      returnPath: "/week",
      createdAt: Date.now(),
    });

    await expect(
      completeGoogleAuthorization({
        ...deps,
        search: callbackSearch("state-3", GOOGLE_AUTH_SCOPES_REQUIRED[0]),
      }),
    ).resolves.toEqual({
      status: "failed",
      message:
        "Missing Google Calendar permissions. Please grant all requested permissions.",
      returnPath: "/week",
    });

    expect(deps.authApi.loginOrSignup).not.toHaveBeenCalled();
    expect(deps.authApi.connectGoogle).not.toHaveBeenCalled();
    expect(deps.completeAuthentication).not.toHaveBeenCalled();
    expect(readGoogleAuthorizationIntent("state-3")).toBeNull();
  });
});
