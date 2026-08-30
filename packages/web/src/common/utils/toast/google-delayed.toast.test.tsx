import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { render, screen, within } from "@testing-library/react";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { mockModuleForFile } from "@web/__tests__/utils/mock-module.test.util";
import * as realConnectGoogle from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { GoogleDelayedToast } from "@web/common/utils/toast/google-delayed.toast";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { beforeEach, describe, expect, it, mock } from "bun:test";

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
