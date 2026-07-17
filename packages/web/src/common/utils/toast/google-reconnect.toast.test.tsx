import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

// mock.module is process-wide and leaks across test files (deleted-toast's
// react-toastify mock would otherwise leak in here with no error/dismiss), so
// this file registers its own full-shape toast mock like the other toast tests.
const toast = Object.assign(mock(), {
  error: mock(),
  dismiss: mock(),
  isActive: mock(() => false),
});

mock.module("react-toastify", () => ({
  ToastContainer: () => null,
  toast,
}));

const mockStartGoogleAuthorization = mock();
mock.module(
  "@web/auth/google/authorization/useStartGoogleAuthorization",
  () => ({
    useStartGoogleAuthorization: () => ({
      loading: false,
      startGoogleAuthorization: mockStartGoogleAuthorization,
    }),
  }),
);

// The real module is captured up front and a flag (flipped off in afterAll)
// decides which implementation runs per call, keeping other test files'
// imports of google.auth.util intact.
const actualGoogleAuthUtil = await import(
  "@web/auth/google/util/google.auth.util"
);
const mockSyncPendingLocalEvents = mock();
let isGoogleAuthUtilMocked = true;

mock.module("@web/auth/google/util/google.auth.util", () => ({
  ...actualGoogleAuthUtil,
  syncPendingLocalEvents: () =>
    isGoogleAuthUtilMocked
      ? mockSyncPendingLocalEvents()
      : actualGoogleAuthUtil.syncPendingLocalEvents(),
}));

const {
  GoogleReconnectToast,
  resetGoogleReconnectToastOnLoadForTests,
  showGoogleReconnectToast,
  showGoogleReconnectToastOnLoad,
} = await import("@web/common/utils/toast/google-reconnect.toast");

afterAll(() => {
  isGoogleAuthUtilMocked = false;
});

describe("GoogleReconnectToast", () => {
  beforeEach(() => {
    mockStartGoogleAuthorization.mockClear();
    mockSyncPendingLocalEvents.mockClear();
    toast.error.mockClear();
    toast.dismiss.mockClear();
  });

  it("explains the disconnect without blaming the user or implying data loss", () => {
    render(<GoogleReconnectToast toastId="google-revoked-api" />);

    expect(
      screen.getByText("Google Calendar disconnected"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This happens when access expires or is revoked. Your events are still safe in Google. Reconnect and Compass will re-import them.",
      ),
    ).toBeInTheDocument();
  });

  it("flushes pending local events, dismisses itself, then starts the consent flow", async () => {
    mockSyncPendingLocalEvents.mockResolvedValue(true);
    render(<GoogleReconnectToast toastId="google-revoked-api" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Reconnect Google Calendar" }),
    );

    await waitFor(() => {
      expect(mockStartGoogleAuthorization).toHaveBeenCalledTimes(1);
    });
    expect(mockSyncPendingLocalEvents).toHaveBeenCalledTimes(1);
    expect(toast.dismiss).toHaveBeenCalledWith("google-revoked-api");
  });

  it("stays open and does not start authorization when the local-event flush fails", async () => {
    mockSyncPendingLocalEvents.mockResolvedValue(false);
    render(<GoogleReconnectToast toastId="google-revoked-api" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Reconnect Google Calendar" }),
    );

    await waitFor(() => {
      expect(mockSyncPendingLocalEvents).toHaveBeenCalledTimes(1);
    });
    expect(mockStartGoogleAuthorization).not.toHaveBeenCalled();
    expect(toast.dismiss).not.toHaveBeenCalled();
  });
});

describe("showGoogleReconnectToast", () => {
  beforeEach(() => {
    toast.error.mockClear();
    toast.isActive.mockReturnValue(false);
  });

  it("does not stack a second toast while one is already visible", () => {
    toast.isActive.mockReturnValue(true);

    showGoogleReconnectToast();

    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("showGoogleReconnectToastOnLoad", () => {
  beforeEach(() => {
    resetGoogleReconnectToastOnLoadForTests();
  });

  // Asserted via the return value rather than toast.error call counts: other
  // test files leak process-wide mocks of error-toast.util, so whether the
  // underlying toast fires here depends on suite order.
  it("shows the reconnect toast at most once per page load", () => {
    expect(showGoogleReconnectToastOnLoad()).toBe(true);
    expect(showGoogleReconnectToastOnLoad()).toBe(false);
  });
});
