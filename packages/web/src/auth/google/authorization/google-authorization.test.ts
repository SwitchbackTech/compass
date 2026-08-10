import { completeGoogleAuthorization } from "./complete-google-authorization";
import { GOOGLE_AUTH_SCOPES_REQUIRED } from "./google-authorization.constants";
import {
  consumeGoogleAuthNeedsConsentRetry,
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
  },
  completeAuthentication: mock(async () => undefined),
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
    ).resolves.toEqual({
      status: "completed",
      returnPath: "/week",
      isNewUser: false,
    });

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
    expect(readGoogleAuthorizationIntent("state-1")).toBeNull();
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
        "Compass needs all the requested permissions to sync your calendar. Please allow them and try again.",
      returnPath: "/week",
    });

    expect(deps.authApi.loginOrSignup).not.toHaveBeenCalled();
    expect(deps.completeAuthentication).not.toHaveBeenCalled();
    expect(readGoogleAuthorizationIntent("state-3")).toBeNull();
  });

  it("marks the next attempt for a forced consent retry when Google withheld a refresh token", async () => {
    const deps = makeDeps();
    deps.authApi.loginOrSignup = mock(async () => {
      throw Object.assign(new Error("Conflict"), {
        response: {
          data: {
            code: "GOOGLE_REFRESH_TOKEN_MISSING",
            message:
              "Google did not grant a fresh authorization. Please try again.",
          },
        },
      });
    });
    writeGoogleAuthorizationIntent("state-4", {
      intent: "signIn",
      returnPath: "/week",
      createdAt: Date.now(),
    });

    expect(consumeGoogleAuthNeedsConsentRetry()).toBe(false);

    await expect(
      completeGoogleAuthorization({
        ...deps,
        search: callbackSearch("state-4"),
      }),
    ).resolves.toEqual({
      status: "failed",
      message: "Google did not grant a fresh authorization. Please try again.",
      returnPath: "/week",
    });

    // Read-and-clear: true exactly once, for the next attempt only.
    expect(consumeGoogleAuthNeedsConsentRetry()).toBe(true);
    expect(consumeGoogleAuthNeedsConsentRetry()).toBe(false);
  });

  it("rejects callbacks without a saved intent", async () => {
    const deps = makeDeps();

    await expect(
      completeGoogleAuthorization({
        ...deps,
        search: callbackSearch("unknown-state"),
      }),
    ).resolves.toEqual({
      status: "failed",
      message: "We couldn't connect your Google account. Please try again.",
      returnPath: "/week",
    });

    expect(deps.authApi.loginOrSignup).not.toHaveBeenCalled();
    expect(deps.completeAuthentication).not.toHaveBeenCalled();
  });
});
