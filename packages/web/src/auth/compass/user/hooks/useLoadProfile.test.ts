import { renderHook, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const getLastKnownEmail = mock(() => "person@example.com");
const markUserAsAuthenticated = mock();
const showSessionExpiredToast = mock();
const getProfile = mock();

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  getLastKnownEmail,
  markUserAsAuthenticated,
}));

mock.module("@web/common/apis/user.api", () => ({
  UserApi: {
    getProfile,
  },
}));

mock.module("@web/common/utils/toast/error-toast.util", () => ({
  showSessionExpiredToast,
}));

async function importHook() {
  const moduleUrl = new URL(
    `./useLoadProfile.ts?test=${Math.random().toString(36).slice(2)}`,
    import.meta.url,
  );

  return import(moduleUrl.href);
}

describe("useLoadProfile", () => {
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    getLastKnownEmail.mockClear().mockReturnValue("person@example.com");
    markUserAsAuthenticated.mockClear();
    showSessionExpiredToast.mockClear();
    getProfile.mockClear();
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("does not log backend-unavailable profile failures in frontend-only mode", async () => {
    const error = new Error("Request failed");
    error.name = "ApiError";
    getProfile.mockRejectedValue(error);
    const { useLoadProfile } = await importHook();

    const { result } = renderHook(() => useLoadProfile(true));

    await waitFor(() => {
      expect(result.current.email).toBeNull();
    });
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
