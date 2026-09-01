import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { render, screen, within } from "@testing-library/react";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { mockModuleForFile } from "@web/__tests__/utils/mock-module.test.util";
import * as realConnectGoogle from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import {
  resetBillingGateAttentionForTests,
  setBillingGateOwnsScreen,
} from "@web/billing/billing-gate-attention";
import {
  billingPreviewActions,
  initialBillingPreviewState,
  useBillingPreviewStore,
} from "@web/billing/billing-preview.store";
import {
  GoogleDelayedToast,
  showGoogleDelayedToast,
} from "@web/common/utils/toast/google-delayed.toast";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const mockRefresh = mock();

mockModuleForFile(
  "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle",
  realConnectGoogle,
  { useConnectGoogle: () => ({ refresh: mockRefresh }) },
);

describe("GoogleDelayedToast", () => {
  const { port, mocks } = createTestToastPort();

  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
    mockRefresh.mockClear();
    mocks.dismiss.mockClear();
    registerToastPort(port);
  });

  it("shows a 1 keycap and refreshes when 1 is pressed", () => {
    render(
      <HotkeysProvider>
        <GoogleDelayedToast toastId="google-delayed" />
      </HotkeysProvider>,
    );

    expect(
      within(
        screen.getByRole("button", { name: "Refresh calendar" }),
      ).getByText("1"),
    ).toBeTruthy();
    expect(screen.getByText("Press Esc to dismiss")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();

    pressKey("1");

    expect(mocks.dismiss).toHaveBeenCalledWith("google-delayed");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});

describe("showGoogleDelayedToast", () => {
  const { port, mocks } = createTestToastPort();

  beforeEach(() => {
    mocks.error.mockClear();
    mocks.isActive.mockReturnValue(false);
    registerToastPort(port);
    resetBillingGateAttentionForTests();
    useBillingPreviewStore.setState(initialBillingPreviewState);
  });

  afterEach(() => {
    resetBillingGateAttentionForTests();
    useBillingPreviewStore.setState(initialBillingPreviewState);
  });

  it("does not show while the billing gate owns the screen", () => {
    setBillingGateOwnsScreen(true);
    showGoogleDelayedToast();
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("shows the deferred toast after Look around first", () => {
    setBillingGateOwnsScreen(true);
    showGoogleDelayedToast();
    expect(mocks.error).not.toHaveBeenCalled();

    billingPreviewActions.enter();

    expect(mocks.error).toHaveBeenCalledTimes(1);
  });
});
