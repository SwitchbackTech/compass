import { Status } from "@core/errors/status.codes";
import { type GoogleAuthCodeRequest } from "@core/types/auth.types";
import { BaseApi } from "@web/common/apis/base/base.api";
import { session } from "@web/common/classes/Session";
import { GoogleAuthCallbackApi } from "./google-auth-callback.api";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const originalFetch = globalThis.fetch;

const payload: GoogleAuthCodeRequest = {
  clientType: "web",
  redirectURIInfo: {
    redirectURIOnProviderDashboard:
      "http://localhost:9080/auth/google/callback",
    redirectURIQueryParams: {
      code: "auth-code",
      scope: "https://www.googleapis.com/auth/calendar",
      state: "state-1",
    },
  },
  thirdPartyId: "google",
};

describe("GoogleAuthCallbackApi", () => {
  beforeEach(() => {
    BaseApi.defaults.adapter = undefined;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    BaseApi.defaults.adapter = undefined;
  });

  it("lets the callback flow handle an expired connect session locally", async () => {
    const signOutSpy = spyOn(session, "signOut").mockResolvedValue(undefined);
    globalThis.fetch = mock(async () =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "unauthorised" }), {
          status: Status.UNAUTHORIZED,
        }),
      ),
    ) as unknown as typeof fetch;

    await expect(
      GoogleAuthCallbackApi.connectGoogle(payload),
    ).rejects.toMatchObject({
      name: "ApiError",
      response: {
        status: Status.UNAUTHORIZED,
      },
    });

    expect(signOutSpy).not.toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/google/connect"),
      expect.objectContaining({
        credentials: "include",
        method: "POST",
      }),
    );

    signOutSpy.mockRestore();
  });

  it("uses shared session handling for non-recoverable connect session errors", async () => {
    window.history.pushState({}, "", "/day");
    const signOutSpy = spyOn(session, "signOut").mockResolvedValue(undefined);
    globalThis.fetch = mock(async () =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "not found" }), {
          status: Status.NOT_FOUND,
        }),
      ),
    ) as unknown as typeof fetch;

    await expect(
      GoogleAuthCallbackApi.connectGoogle(payload),
    ).rejects.toMatchObject({
      name: "ApiError",
      response: {
        status: Status.NOT_FOUND,
      },
    });

    expect(signOutSpy).toHaveBeenCalledTimes(1);

    signOutSpy.mockRestore();
  });
});
