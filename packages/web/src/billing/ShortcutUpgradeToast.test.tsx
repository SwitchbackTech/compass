import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { BillingApi } from "@web/api/billing.api";
import { ShortcutUpgradeToast } from "@web/billing/ShortcutUpgradeToast";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { afterEach, describe, expect, it, spyOn } from "bun:test";

const assign = spyOn(window.location, "assign").mockImplementation(() => {});

describe("ShortcutUpgradeToast", () => {
  const { port, mocks } = createTestToastPort();

  afterEach(() => {
    assign.mockClear();
    HotkeyManager.resetInstance();
  });

  it("starts checkout from the CTA and dismisses the toast", async () => {
    const createCheckoutSession = spyOn(
      BillingApi,
      "createCheckoutSession",
    ).mockResolvedValue({ url: "https://checkout.stripe.com/c/ok" });
    registerToastPort(port);
    const user = userEvent.setup();
    render(
      <HotkeysProvider>
        <ShortcutUpgradeToast
          toastId="shortcut-upgrade-toast"
          title="Unlock event editing shortcuts with Premium. Upgrade in 30 seconds."
          ctaLabel="Start trial"
        />
      </HotkeysProvider>,
    );

    expect(
      screen.getByText(
        "Unlock event editing shortcuts with Premium. Upgrade in 30 seconds.",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: "Start trial" })).getByText(
        "S",
      ),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Start trial" }));

    await waitFor(() => {
      expect(createCheckoutSession).toHaveBeenCalled();
      expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/ok");
    });
    expect(mocks.dismiss).toHaveBeenCalledWith("shortcut-upgrade-toast");
    createCheckoutSession.mockRestore();
  });
});
