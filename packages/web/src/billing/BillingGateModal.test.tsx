import "@testing-library/jest-dom";
import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Status } from "@core/errors/status.codes";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { type ApiError } from "@web/api/api.types";
import { BillingApi } from "@web/api/billing.api";
import { SessionContext } from "@web/auth/compass/session/session.context";
import {
  initialBillingPreviewState,
  useBillingPreviewStore,
} from "@web/billing/billing-preview.store";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { BillingGateModal } from "./BillingGateModal";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const assign = spyOn(window.location, "assign").mockImplementation(() => {});

const checkoutFailed = (): ApiError => {
  const error = new Error(
    "Request failed for POST /billing/checkout/session with status 500",
  ) as ApiError;
  error.name = "ApiError";
  error.response = {
    config: {},
    data: { error: "Internal server error" },
    headers: new Headers(),
    status: Status.INTERNAL_SERVER,
    statusText: "Internal Server Error",
  };
  return error;
};

const renderGate = (status = "awaiting_checkout") =>
  render(
    <HotkeysProvider>
      <SessionContext.Provider
        value={{ authenticated: true, setAuthenticated: () => {} }}
      >
        <BillingGateModal status={status} />
      </SessionContext.Provider>
    </HotkeysProvider>,
  );

describe("BillingGateModal", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
  });

  afterEach(() => {
    assign.mockClear();
    useBillingPreviewStore.setState(initialBillingPreviewState);
  });

  it("redirects to Stripe Checkout from Start trial", async () => {
    const createCheckoutSession = spyOn(
      BillingApi,
      "createCheckoutSession",
    ).mockResolvedValue({ url: "https://checkout.stripe.com/c/ok" });
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);
    const user = userEvent.setup();
    renderGate();

    await user.click(screen.getByRole("button", { name: "Start trial" }));

    expect(createCheckoutSession).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/ok");
    expect(mocks.error).not.toHaveBeenCalled();
    createCheckoutSession.mockRestore();
  });

  it("shows a toast when checkout fails instead of failing silently", async () => {
    const createCheckoutSession = spyOn(
      BillingApi,
      "createCheckoutSession",
    ).mockImplementation(() => Promise.reject(checkoutFailed()));
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);
    const user = userEvent.setup();
    renderGate();

    await user.click(screen.getByRole("button", { name: "Start trial" }));

    await waitFor(() => {
      expect(mocks.error).toHaveBeenCalledWith(
        "Couldn't start checkout. Please try again.",
        expect.any(Object),
      );
    });
    expect(assign).not.toHaveBeenCalled();
    createCheckoutSession.mockRestore();
  });

  it("shows shortcut keycaps and focuses Start trial", () => {
    renderGate();

    expect(screen.getByRole("button", { name: "Start trial" })).toHaveFocus();
    for (const [name, key] of [
      ["Start trial", "S"],
      ["Look around first", "L"],
    ] as const) {
      expect(
        within(screen.getByRole("button", { name })).getByText(key),
      ).toBeTruthy();
    }
    expect(
      screen.queryByRole("button", { name: "Export my data" }),
    ).not.toBeInTheDocument();
  });

  it("does not mention a price on the start-trial or subscribe copy", () => {
    const { unmount } = renderGate();

    expect(
      screen.getByText("Try Compass for free for 7 days"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\$|\/month/i)).not.toBeInTheDocument();
    unmount();

    renderGate("canceled");
    expect(screen.getByText("Your trial has ended.")).toBeInTheDocument();
    expect(screen.queryByText(/\$|\/month/i)).not.toBeInTheDocument();
  });

  it("starts checkout with S and does not dismiss on Escape", async () => {
    const createCheckoutSession = spyOn(
      BillingApi,
      "createCheckoutSession",
    ).mockResolvedValue({ url: "https://checkout.stripe.com/c/ok" });
    const { port } = createTestToastPort();
    registerToastPort(port);
    const user = userEvent.setup();
    renderGate();

    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("dialog", { name: "Start your 7-day trial" }),
    ).toBeInTheDocument();
    expect(createCheckoutSession).not.toHaveBeenCalled();

    await user.keyboard("s");

    expect(createCheckoutSession).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/ok");
    createCheckoutSession.mockRestore();
  });

  it("enters the read-only look-around with L", async () => {
    const user = userEvent.setup();
    renderGate();

    await user.keyboard("l");
    expect(useBillingPreviewStore.getState().isPreviewing).toBe(true);
  });

  it("offers no look-around once the trial is spent", () => {
    renderGate("canceled");

    expect(
      screen.queryByRole("button", { name: /Look around first/ }),
    ).not.toBeInTheDocument();
  });

  it("traps Tab within the dialog", async () => {
    const user = userEvent.setup();
    renderGate();

    const start = screen.getByRole("button", { name: "Start trial" });
    const lookAround = screen.getByRole("button", {
      name: "Look around first",
    });
    expect(start).toHaveFocus();

    await user.tab({ shift: true });
    expect(lookAround).toHaveFocus();

    await user.tab();
    expect(start).toHaveFocus();
  });

  it("opens the billing portal with M when subscribe is required", async () => {
    const createPortalSession = spyOn(
      BillingApi,
      "createPortalSession",
    ).mockResolvedValue({ url: "https://billing.stripe.com/p/ok" });
    const { port } = createTestToastPort();
    registerToastPort(port);
    const replace = mock(() => {});
    const popup = { closed: false, location: { replace }, opener: {} };
    const open = spyOn(window, "open").mockReturnValue(
      popup as unknown as Window,
    );
    const user = userEvent.setup();
    renderGate("canceled");

    expect(
      within(screen.getByRole("button", { name: "Manage billing" })).getByText(
        "M",
      ),
    ).toBeTruthy();

    await user.keyboard("m");

    expect(createPortalSession).toHaveBeenCalled();
    await waitFor(() => {
      expect(open).toHaveBeenCalledWith("about:blank", "_blank");
      expect(replace).toHaveBeenCalledWith("https://billing.stripe.com/p/ok");
    });
    expect(assign).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: (accessibleName) =>
          accessibleName.includes("Manage billing") ||
          accessibleName.includes("Opening Stripe"),
      }),
    ).toHaveFocus();
    createPortalSession.mockRestore();
    open.mockRestore();
  });
});
