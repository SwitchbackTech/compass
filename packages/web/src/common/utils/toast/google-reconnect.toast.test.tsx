import { fireEvent, render, screen } from "@testing-library/react";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import {
  GoogleReconnectToast,
  showGoogleReconnectToast,
} from "@web/common/utils/toast/google-reconnect.toast";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockConnect = mock();
const mockUseConnectGoogle = mock(() => ({ connect: mockConnect }));

// useConnectGoogle owns the flush-pending-events -> delegation-fork ->
// legacy-popup-or-sync-redirect logic (the exact thing that drifted out of
// sync here before: this toast used to reimplement a legacy-only copy of it
// directly). Mocking the hook keeps this file testing only what it owns —
// that a click dismisses the toast and calls connect() — not re-deriving
// useConnectGoogle's own behavior.
mock.module("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: mockUseConnectGoogle,
}));

describe("GoogleReconnectToast", () => {
  const { port, mocks } = createTestToastPort();

  beforeEach(() => {
    mockConnect.mockClear();
    mocks.error.mockClear();
    mocks.dismiss.mockClear();
    mocks.isActive.mockReturnValue(false);
    registerToastPort(port);
  });

  const renderToast = () =>
    render(<GoogleReconnectToast toastId="google-revoked-api" />);

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

  it("dismisses itself and starts connect() on click", () => {
    renderToast();

    fireEvent.click(
      screen.getByRole("button", { name: "Reconnect Google Calendar" }),
    );

    expect(mocks.dismiss).toHaveBeenCalledWith("google-revoked-api");
    expect(mockConnect).toHaveBeenCalledTimes(1);
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
