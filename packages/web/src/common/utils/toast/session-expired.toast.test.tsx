import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { render, screen, within } from "@testing-library/react";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { SessionExpiredToast } from "@web/common/utils/toast/session-expired.toast";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockNavigate = mock();

mock.module("@web/routers", () => ({
  router: { navigate: mockNavigate },
}));

describe("SessionExpiredToast", () => {
  const { port, mocks } = createTestToastPort();

  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
    mockNavigate.mockClear();
    mocks.dismiss.mockClear();
    registerToastPort(port);
  });

  it("shows a 1 keycap and signs in when 1 is pressed", () => {
    render(
      <HotkeysProvider>
        <SessionExpiredToast toastId="session-expired-api" />
      </HotkeysProvider>,
    );

    expect(
      within(screen.getByRole("button", { name: "Sign in" })).getByText("1"),
    ).toBeTruthy();

    pressKey("1");

    expect(mocks.dismiss).toHaveBeenCalledWith("session-expired-api");
  });
});
