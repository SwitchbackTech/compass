import { act, renderHook, waitFor } from "@testing-library/react";
import { type UserProfile } from "@core/types/user.types";
import { type UseLoadProfileResult } from "@web/auth/compass/user/hooks/useLoadProfile";
import {
  afterAll,
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

// mock.module is process-wide and not reliably restorable, so the real
// UserApi is captured up front and a flag (flipped off in afterAll) decides
// which implementation runs on each call. Without this, this file's partial
// UserApi shape (getProfile only) would permanently shadow the real module
// for other files' UserApi methods (e.g. useSubscribeCmdItems.test.ts's
// updateMetadata).
const actualUserApi = (await import("@web/api/user.api")).UserApi;
let isUserApiMocked = true;

mock.module("@web/api/user.api", () => ({
  UserApi: {
    ...actualUserApi,
    getProfile: (...args: Parameters<typeof actualUserApi.getProfile>) =>
      isUserApiMocked ? getProfile(...args) : actualUserApi.getProfile(...args),
  },
}));

afterAll(() => {
  isUserApiMocked = false;
});

// Same rationale as the UserApi mock above: spread the real module's other
// exports (showErrorToast, dismissErrorToast, etc.) and only conditionally
// override showSessionExpiredToast, so this file's mock doesn't permanently
// strip the rest of the module for other files that resolve it afterward.
const actualErrorToastUtil = await import(
  "@web/common/utils/toast/error-toast.util"
);
let isErrorToastUtilMocked = true;

mock.module("@web/common/utils/toast/error-toast.util", () => ({
  ...actualErrorToastUtil,
  showSessionExpiredToast: () =>
    isErrorToastUtilMocked
      ? showSessionExpiredToast()
      : actualErrorToastUtil.showSessionExpiredToast(),
}));

afterAll(() => {
  isErrorToastUtilMocked = false;
});

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
