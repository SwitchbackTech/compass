import { renderHook, waitFor } from "@testing-library/react";
import { isValidElement, type ReactElement } from "react";
import { Status } from "@core/errors/status.codes";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockGetLastKnownEmail = mock();
const mockGetProfile = mock();
const mockMarkUserAsAuthenticated = mock();
const mockToastDismiss = mock();
const mockToastError = mock();
const mockToastIsActive = mock();

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  getLastKnownEmail: mockGetLastKnownEmail,
  markUserAsAuthenticated: mockMarkUserAsAuthenticated,
}));

mock.module("@web/common/apis/user.api", () => ({
  UserApi: {
    getProfile: mockGetProfile,
  },
}));

mock.module("react-toastify", () => {
  const toast = Object.assign(mock(), {
    dismiss: mockToastDismiss,
    error: mockToastError,
    isActive: mockToastIsActive,
  });

  return {
    default: toast,
    toast,
  };
});

const { SessionExpiredToast } =
  require("@web/common/utils/toast/session-expired.toast") as typeof import("@web/common/utils/toast/session-expired.toast");
const { useLoadProfile } =
  require("./useLoadProfile") as typeof import("./useLoadProfile");

describe("useLoadProfile", () => {
  beforeEach(() => {
    mockGetLastKnownEmail.mockClear();
    mockGetProfile.mockClear();
    mockMarkUserAsAuthenticated.mockClear();
    mockToastDismiss.mockClear();
    mockToastError.mockClear();
    mockToastIsActive.mockClear();

    mockGetProfile.mockResolvedValue({
      userId: "test-user-123",
      email: "test@example.com",
    });
    mockGetLastKnownEmail.mockReturnValue("last-known@example.com");
    mockToastError.mockReturnValue("mock-toast-id");
    mockToastIsActive.mockReturnValue(false);
  });

  it("does not call getProfile when user has never authenticated", async () => {
    renderHook(() => useLoadProfile(false));

    await waitFor(() => {
      expect(mockGetProfile).not.toHaveBeenCalled();
    });
  });

  it("calls getProfile when hasAuthenticatedBefore is true", async () => {
    renderHook(() => useLoadProfile(true));

    await waitFor(() => expect(mockGetProfile).toHaveBeenCalled());
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
  });

  it("fetches the profile when hasAuthenticatedBefore becomes true after mount", async () => {
    const { result, rerender } = renderHook(
      ({ hasAuthenticatedBefore }: { hasAuthenticatedBefore: boolean }) =>
        useLoadProfile(hasAuthenticatedBefore),
      { initialProps: { hasAuthenticatedBefore: false } },
    );

    await waitFor(() => {
      expect(result.current.email).toBeNull();
    });
    expect(mockGetProfile).not.toHaveBeenCalled();

    rerender({ hasAuthenticatedBefore: true });

    await waitFor(() => expect(mockGetProfile).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(result.current.email).toBe("test@example.com");
    });
  });

  it("shows the last known email while the profile is loading", async () => {
    let resolveProfile!: (profile: { userId: string; email: string }) => void;
    mockGetProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve;
      }),
    );

    const { result } = renderHook(() => useLoadProfile(true));

    expect(result.current.email).toBe("last-known@example.com");
    resolveProfile({
      userId: "test-user-123",
      email: "test@example.com",
    });

    await waitFor(() => {
      expect(result.current.email).toBe("test@example.com");
    });
  });

  it("returns profile without email when the API omits email", async () => {
    mockGetProfile.mockResolvedValue({ userId: "test-user-123" });

    const { result } = renderHook(() => useLoadProfile(true));

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });
    expect(result.current.profileEmail).toBeNull();
    expect(result.current.userId).toBe("test-user-123");
  });

  it("returns profile without userId when the API omits userId", async () => {
    mockGetProfile.mockResolvedValue({ email: "test@example.com" });

    const { result } = renderHook(() => useLoadProfile(true));

    await waitFor(() => expect(mockGetProfile).toHaveBeenCalled());
    await mockGetProfile.mock.results[0].value;

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });
    expect(result.current.userId).toBeNull();
    expect(result.current.profileEmail).toBe("test@example.com");
  });

  it("shows a login toast when profile fetch returns unauthorized", async () => {
    mockGetProfile.mockRejectedValue({
      response: { status: Status.UNAUTHORIZED },
    });

    renderHook(() => useLoadProfile(true));

    await waitFor(() => expect(mockGetProfile).toHaveBeenCalled());
    try {
      await mockGetProfile.mock.results[0].value;
    } catch {
      // expected: profile fetch rejects on 401
    }

    expect(mockToastError).toHaveBeenCalled();
    const latestToastCall =
      mockToastError.mock.calls[mockToastError.mock.calls.length - 1];
    expect(latestToastCall[1]).toEqual(
      expect.objectContaining({
        toastId: "session-expired-api",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }),
    );

    const toastContent = latestToastCall[0];
    expect(isValidElement(toastContent)).toBe(true);
    const toastElement = toastContent as ReactElement<{ toastId: string }>;
    expect(toastElement.type).toBe(SessionExpiredToast);
    expect(toastElement.props.toastId).toBe("session-expired-api");
  });
});
