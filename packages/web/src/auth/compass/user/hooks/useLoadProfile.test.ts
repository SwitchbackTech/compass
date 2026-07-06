import { act, renderHook, waitFor } from "@testing-library/react";
import { type UserProfile } from "@core/types/user.types";
import { type UseLoadProfileResult } from "@web/auth/compass/user/hooks/useLoadProfile";
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

const mockProfile: UserProfile = {
  firstName: "Person",
  lastName: "One",
  name: "Person One",
  email: "person@example.com",
  locale: "en-US",
  picture: "",
  userId: "user-1",
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

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

function renderToggleableAuth(
  useLoadProfile: (hasAuthenticatedBefore: boolean) => UseLoadProfileResult,
) {
  return renderHook(
    ({ hasAuthenticatedBefore }: { hasAuthenticatedBefore: boolean }) =>
      useLoadProfile(hasAuthenticatedBefore),
    { initialProps: { hasAuthenticatedBefore: true } },
  );
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

  it("clears the profile and email once the user signs out", async () => {
    getProfile.mockResolvedValue(mockProfile);
    const { useLoadProfile } = await importHook();

    const { result, rerender } = renderToggleableAuth(useLoadProfile);

    await waitFor(() => {
      expect(result.current.email).toBe(mockProfile.email);
    });

    rerender({ hasAuthenticatedBefore: false });

    expect(result.current.email).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it("drops a profile response that resolves after the user has already signed out", async () => {
    let resolveProfile!: (profile: UserProfile) => void;
    getProfile.mockImplementation(
      () =>
        new Promise<UserProfile>((resolve) => {
          resolveProfile = resolve;
        }),
    );
    const { useLoadProfile } = await importHook();

    const { result, rerender } = renderToggleableAuth(useLoadProfile);

    expect(getProfile).toHaveBeenCalledTimes(1);

    rerender({ hasAuthenticatedBefore: false });
    expect(result.current.email).toBeNull();

    await act(async () => {
      resolveProfile(mockProfile);
      await flushPromises();
    });

    expect(result.current.email).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(markUserAsAuthenticated).not.toHaveBeenCalled();
  });
});
