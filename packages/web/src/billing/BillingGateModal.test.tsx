import "@testing-library/jest-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Status } from "@core/errors/status.codes";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { type ApiError } from "@web/api/api.types";
import { BillingApi } from "@web/api/billing.api";
import { SessionContext } from "@web/auth/compass/session/session.context";
import * as exportUtil from "@web/common/storage/offline-data/export-user-data.util";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { BillingGateModal } from "./BillingGateModal";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

const assign = spyOn(window.location, "assign").mockImplementation(() => {});
const mockLogout = mock(() => Promise.resolve({ signedOutRemotely: true }));

mock.module("@web/auth/compass/hooks/useLogout", () => ({
  useLogout: () => mockLogout,
}));

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
    <SessionContext.Provider
      value={{ authenticated: true, setAuthenticated: () => {} }}
    >
      <BillingGateModal status={status} />
    </SessionContext.Provider>,
  );

describe("BillingGateModal", () => {
  afterEach(() => {
    assign.mockClear();
    mockLogout.mockClear();
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
      ["Export my data", "E"],
      ["Log out", "L"],
    ] as const) {
      expect(
        within(screen.getByRole("button", { name })).getByText(key),
      ).toBeTruthy();
    }
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

  it("exports with E and logs out with L", async () => {
    const exportSpy = spyOn(exportUtil, "runExportMyData").mockResolvedValue();
    const user = userEvent.setup();
    renderGate();

    await user.keyboard("e");
    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalled();
    });

    await user.keyboard("l");
    expect(mockLogout).toHaveBeenCalled();
    exportSpy.mockRestore();
  });

  it("traps Tab within the dialog", async () => {
    const user = userEvent.setup();
    renderGate();

    const start = screen.getByRole("button", { name: "Start trial" });
    const logout = screen.getByRole("button", { name: "Log out" });
    expect(start).toHaveFocus();

    await user.tab({ shift: true });
    expect(logout).toHaveFocus();

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
    const user = userEvent.setup();
    renderGate("canceled");

    expect(
      within(screen.getByRole("button", { name: "Manage billing" })).getByText(
        "M",
      ),
    ).toBeTruthy();

    await user.keyboard("m");

    expect(createPortalSession).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith("https://billing.stripe.com/p/ok");
    createPortalSession.mockRestore();
  });
});
