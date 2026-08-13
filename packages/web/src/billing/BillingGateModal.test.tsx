import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Status } from "@core/errors/status.codes";
import { type ApiError } from "@web/api/api.types";
import { BillingApi } from "@web/api/billing.api";
import { SessionContext } from "@web/auth/compass/session/session.context";
import * as errorToast from "@web/common/utils/toast/error-toast.util";
import { BillingGateModal } from "./BillingGateModal";
import { afterEach, describe, expect, it, spyOn } from "bun:test";

const assign = spyOn(window.location, "assign").mockImplementation(() => {});
const showErrorToast = spyOn(errorToast, "showErrorToast");

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

const renderGate = () =>
  render(
    <SessionContext.Provider
      value={{ authenticated: true, setAuthenticated: () => {} }}
    >
      <BillingGateModal status="awaiting_checkout" />
    </SessionContext.Provider>,
  );

describe("BillingGateModal", () => {
  afterEach(() => {
    assign.mockClear();
    showErrorToast.mockClear();
  });

  it("redirects to Stripe Checkout from Start trial", async () => {
    const createCheckoutSession = spyOn(
      BillingApi,
      "createCheckoutSession",
    ).mockResolvedValue({ url: "https://checkout.stripe.com/c/ok" });
    const user = userEvent.setup();
    renderGate();

    await user.click(screen.getByRole("button", { name: "Start trial" }));

    expect(createCheckoutSession).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/ok");
    expect(showErrorToast).not.toHaveBeenCalled();
    createCheckoutSession.mockRestore();
  });

  it("shows a toast when checkout fails instead of failing silently", async () => {
    const createCheckoutSession = spyOn(
      BillingApi,
      "createCheckoutSession",
    ).mockRejectedValue(checkoutFailed());
    const user = userEvent.setup();
    renderGate();

    await user.click(screen.getByRole("button", { name: "Start trial" }));

    expect(assign).not.toHaveBeenCalled();
    expect(showErrorToast).toHaveBeenCalledWith(
      "Couldn't start checkout. Please try again.",
    );
    createCheckoutSession.mockRestore();
  });
});
