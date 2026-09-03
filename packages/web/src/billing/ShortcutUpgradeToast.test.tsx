import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import * as Track from "@web/auth/posthog/track";
import {
  billingPreviewActions,
  initialBillingPreviewState,
  useBillingPreviewStore,
} from "@web/billing/billing-preview.store";
import {
  initialCheckoutPanelState,
  selectCheckoutPanelOpen,
  useCheckoutPanelStore,
} from "@web/billing/checkout-panel.store";
import { ShortcutUpgradeToast } from "@web/billing/ShortcutUpgradeToast";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { afterEach, describe, expect, it, spyOn } from "bun:test";

describe("ShortcutUpgradeToast", () => {
  const { port, mocks } = createTestToastPort();

  afterEach(() => {
    HotkeyManager.resetInstance();
    useBillingPreviewStore.setState(initialBillingPreviewState);
    useCheckoutPanelStore.setState(initialCheckoutPanelState, true);
  });

  it("opens embedded checkout from the CTA and dismisses the toast", async () => {
    registerToastPort(port);
    billingPreviewActions.enter();
    const track = spyOn(Track, "track");
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

    expect(track).toHaveBeenCalledWith("billing_gate_cta_clicked", {
      cta: "shortcut_prompt",
    });
    expect(selectCheckoutPanelOpen(useCheckoutPanelStore.getState())).toBe(
      true,
    );
    expect(useBillingPreviewStore.getState().isPreviewing).toBe(false);
    expect(mocks.dismiss).toHaveBeenCalledWith("shortcut-upgrade-toast");
    track.mockRestore();
  });
});
