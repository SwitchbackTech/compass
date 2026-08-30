import "@testing-library/jest-dom";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { BillingApi } from "@web/api/billing.api";
import { useUpgradeConfirmation } from "@web/billing/UpgradeConfirmation/hooks/useUpgradeConfirmation";
import { UpgradeConfirmationProvider } from "@web/billing/UpgradeConfirmation/UpgradeConfirmationProvider";
import {
  registerToastPort,
  resetToastPort,
} from "@web/common/utils/toast/toast.port";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

// Register a toast port rather than spying the toast utils: spyOn patches the
// shared module object, so calls here would leak into other suites' spies.
let toastMocks: ReturnType<typeof createTestToastPort>["mocks"];
const assign = spyOn(window.location, "assign").mockImplementation(() => {});

function OpenButton() {
  const { openUpgradeConfirmation } = useUpgradeConfirmation();
  return (
    <button type="button" onClick={openUpgradeConfirmation}>
      open upgrade
    </button>
  );
}

const renderProvider = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <HotkeysProvider>
        <UpgradeConfirmationProvider>
          <OpenButton />
        </UpgradeConfirmationProvider>
      </HotkeysProvider>
    </QueryClientProvider>,
  );

const openDialog = async () => {
  renderProvider();
  await userEvent.click(screen.getByRole("button", { name: "open upgrade" }));
  return screen.getByRole("dialog", {
    name: "Start Premium now?",
  });
};

beforeEach(() => {
  const { port, mocks } = createTestToastPort();
  toastMocks = mocks;
  registerToastPort(port);
});

afterEach(() => {
  resetToastPort();
  assign.mockClear();
});

describe("UpgradeConfirmationProvider", () => {
  it("does not name a price, since the price lives in Stripe", async () => {
    const dialog = await openDialog();
    expect(dialog.textContent).not.toMatch(/\$|\bUSD\b|\bmonth\b/);
    expect(dialog).toHaveTextContent("the card on file is charged today");
    expect(dialog).toHaveTextContent(
      "It does not charge you or end the trial.",
    );
  });

  it("ends the trial and confirms the subscription", async () => {
    const endTrial = spyOn(BillingApi, "endTrial").mockResolvedValue({
      subscriptionStatus: "active",
      trialEndsAt: null,
      isReadOnly: false,
    });
    await openDialog();

    await userEvent.click(
      screen.getByRole("button", { name: /Start Premium/ }),
    );

    await waitFor(() => {
      expect(endTrial).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(toastMocks.toast).toHaveBeenCalledWith(
        "You're subscribed",
        expect.objectContaining({ toastId: "billing-subscribed" }),
      );
    });
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Start Premium now?" }),
    ).not.toBeInTheDocument();
    endTrial.mockRestore();
  });

  it("reports a declined card instead of a false success", async () => {
    const endTrial = spyOn(BillingApi, "endTrial").mockResolvedValue({
      subscriptionStatus: "past_due",
      trialEndsAt: null,
      isReadOnly: false,
    });
    await openDialog();

    await userEvent.click(
      screen.getByRole("button", { name: /Start Premium/ }),
    );

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith(
        "We ended your trial, but the payment didn't go through. Check your card under Manage billing.",
        expect.anything(),
      );
    });
    expect(toastMocks.toast).not.toHaveBeenCalled();
    endTrial.mockRestore();
  });

  it("surfaces a failed request as an error toast", async () => {
    const endTrial = spyOn(BillingApi, "endTrial").mockRejectedValue(
      new Error("boom"),
    );
    await openDialog();

    await userEvent.click(
      screen.getByRole("button", { name: /Start Premium/ }),
    );

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith(
        "Couldn't subscribe. Please try again.",
        expect.anything(),
      );
    });
    endTrial.mockRestore();
  });

  it("closes on cancel without calling Stripe", async () => {
    const endTrial = spyOn(BillingApi, "endTrial");
    await openDialog();

    await userEvent.click(screen.getByRole("button", { name: /Cancel/ }));

    expect(
      screen.queryByRole("dialog", { name: "Start Premium now?" }),
    ).not.toBeInTheDocument();
    expect(endTrial).not.toHaveBeenCalled();
    endTrial.mockRestore();
  });

  it("closes on Escape without calling Stripe", async () => {
    const endTrial = spyOn(BillingApi, "endTrial");
    await openDialog();

    await userEvent.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Start Premium now?" }),
    ).not.toBeInTheDocument();
    expect(endTrial).not.toHaveBeenCalled();
    endTrial.mockRestore();
  });

  it("closes on Escape even when focus is outside the dialog", async () => {
    await openDialog();
    document.body.focus();

    await userEvent.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Start Premium now?" }),
    ).not.toBeInTheDocument();
  });

  it("sends Manage billing to the Stripe portal in a new tab", async () => {
    const portal = spyOn(BillingApi, "createPortalSession").mockResolvedValue({
      url: "https://billing.stripe.com/p/session_1",
    });
    const replace = mock(() => {});
    const popup = { closed: false, location: { replace }, opener: {} };
    const open = spyOn(window, "open").mockReturnValue(
      popup as unknown as Window,
    );
    await openDialog();

    await userEvent.click(
      screen.getByRole("button", { name: "Manage billing" }),
    );

    await waitFor(() => {
      expect(open).toHaveBeenCalledWith("about:blank", "_blank");
      expect(replace).toHaveBeenCalledWith(
        "https://billing.stripe.com/p/session_1",
      );
    });
    expect(assign).not.toHaveBeenCalled();
    portal.mockRestore();
    open.mockRestore();
  });

  it("opens the portal with M and does not end the trial", async () => {
    const endTrial = spyOn(BillingApi, "endTrial");
    const portal = spyOn(BillingApi, "createPortalSession").mockResolvedValue({
      url: "https://billing.stripe.com/p/session_1",
    });
    const replace = mock(() => {});
    const popup = { closed: false, location: { replace }, opener: {} };
    spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    await openDialog();

    await userEvent.keyboard("m");

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "https://billing.stripe.com/p/session_1",
      );
    });
    expect(endTrial).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: (accessibleName) =>
          accessibleName.includes("Manage billing") ||
          accessibleName.includes("Opening Stripe"),
      }),
    ).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(endTrial).not.toHaveBeenCalled();
    portal.mockRestore();
    endTrial.mockRestore();
  });

  it("stays in Compass if the portal tab is closed before the URL lands", async () => {
    const popup = {
      closed: false,
      close: mock(),
      location: { replace: mock() },
      opener: {},
    };
    spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    const portal = spyOn(BillingApi, "createPortalSession").mockImplementation(
      async () => {
        popup.closed = true;
        return { url: "https://billing.stripe.com/p/session_1" };
      },
    );
    await openDialog();

    await userEvent.click(
      screen.getByRole("button", { name: "Manage billing" }),
    );

    await waitFor(() => {
      expect(portal).toHaveBeenCalled();
    });
    expect(assign).not.toHaveBeenCalled();
    expect(popup.location.replace).not.toHaveBeenCalled();
    portal.mockRestore();
  });

  it("activates Manage billing on hover then Enter instead of Start Premium", async () => {
    const endTrial = spyOn(BillingApi, "endTrial");
    const portal = spyOn(BillingApi, "createPortalSession").mockResolvedValue({
      url: "https://billing.stripe.com/p/session_1",
    });
    const replace = mock(() => {});
    const popup = { closed: false, location: { replace }, opener: {} };
    spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    await openDialog();

    const manage = screen.getByRole("button", { name: "Manage billing" });
    fireEvent.pointerEnter(manage, { pointerType: "mouse" });
    expect(manage).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "https://billing.stripe.com/p/session_1",
      );
    });
    expect(endTrial).not.toHaveBeenCalled();
    portal.mockRestore();
    endTrial.mockRestore();
  });
});
