import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { registerUseStartGoogleAuthorizationForTests } from "@web/auth/google/authorization/useStartGoogleAuthorization.registry";
import {
  GoogleReconnectToast,
  showGoogleReconnectToast,
} from "@web/common/utils/toast/google-reconnect.toast";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { beforeEach, describe, expect, it, mock } from "bun:test";

describe("GoogleReconnectToast", () => {
  const { port, mocks } = createTestToastPort();
  const mockStartGoogleAuthorization = mock();
  const mockSyncPendingLocalEvents = mock();

  beforeEach(() => {
    mockStartGoogleAuthorization.mockClear();
    mockSyncPendingLocalEvents.mockClear();
    mocks.error.mockClear();
    mocks.dismiss.mockClear();
    mocks.isActive.mockReturnValue(false);
    registerToastPort(port);
    registerUseStartGoogleAuthorizationForTests(() => ({
      loading: false,
      startGoogleAuthorization: mockStartGoogleAuthorization,
    }));
  });

  const renderToast = () =>
    render(
      <GoogleReconnectToast
        toastId="google-revoked-api"
        syncPendingLocalEvents={mockSyncPendingLocalEvents}
      />,
    );

  it("explains the disconnect without blaming the user or implying data loss", () => {
    renderToast();

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
    renderToast();

    await userEvent.click(
      screen.getByRole("button", { name: "Reconnect Google Calendar" }),
    );

    await waitFor(() => {
      expect(mockStartGoogleAuthorization).toHaveBeenCalledTimes(1);
    });
    expect(mockSyncPendingLocalEvents).toHaveBeenCalledTimes(1);
    expect(mocks.dismiss).toHaveBeenCalledWith("google-revoked-api");
  });

  it("stays open and does not start authorization when the local-event flush fails", async () => {
    mockSyncPendingLocalEvents.mockResolvedValue(false);
    renderToast();

    await userEvent.click(
      screen.getByRole("button", { name: "Reconnect Google Calendar" }),
    );

    await waitFor(() => {
      expect(mockSyncPendingLocalEvents).toHaveBeenCalledTimes(1);
    });
    expect(mockStartGoogleAuthorization).not.toHaveBeenCalled();
    expect(mocks.dismiss).not.toHaveBeenCalled();
  });
});

describe("showGoogleReconnectToast", () => {
  const { port, mocks } = createTestToastPort();

  beforeEach(() => {
    mocks.error.mockClear();
    mocks.isActive.mockReturnValue(false);
    registerToastPort(port);
  });

  it("does not stack a second toast while one is already visible", () => {
    mocks.isActive.mockReturnValue(true);

    showGoogleReconnectToast();

    expect(mocks.error).not.toHaveBeenCalled();
  });
});
