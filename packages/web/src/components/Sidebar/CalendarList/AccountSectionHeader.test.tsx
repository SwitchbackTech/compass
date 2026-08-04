import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { AuthApi } from "@web/api/auth.api";
import { AccountSectionHeader } from "./AccountSectionHeader";
import { describe, expect, it, spyOn } from "bun:test";

const connection = (
  overrides: Partial<GoogleSyncConnectionSummary> = {},
): GoogleSyncConnectionSummary => ({
  id: "connection-1",
  state: "healthy",
  stateReason: null,
  lastSyncedAt: null,
  lastHealthyAt: null,
  accountEmail: "ahab@pequod.com",
  connectionState: "HEALTHY",
  ...overrides,
});

const renderHeader = (summary = connection()) => {
  const { wrapper } = createStoreWrapper();
  return render(
    <AccountSectionHeader
      accountEmail={summary.accountEmail ?? "ahab@pequod.com"}
      connection={summary}
    />,
    { wrapper },
  );
};

describe("AccountSectionHeader disconnect", () => {
  it("asks for confirmation before disconnecting", async () => {
    const disconnect = spyOn(
      AuthApi,
      "disconnectGoogleConnection",
    ).mockResolvedValue(undefined);

    const user = userEvent.setup({ delay: null });
    renderHeader();

    await user.click(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    );

    // Disconnecting is not undoable without redoing the whole OAuth flow, so
    // the first press must not call the API.
    expect(disconnect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: "Confirm disconnecting ahab@pequod.com",
      }),
    ).toBeInTheDocument();

    disconnect.mockRestore();
  });

  it("disconnects that connection once confirmed", async () => {
    const disconnect = spyOn(
      AuthApi,
      "disconnectGoogleConnection",
    ).mockResolvedValue(undefined);

    const user = userEvent.setup({ delay: null });
    renderHeader(connection({ id: "connection-second" }));

    await user.click(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Confirm disconnecting ahab@pequod.com",
      }),
    );

    await waitFor(() => {
      expect(disconnect).toHaveBeenCalledWith("connection-second");
    });

    disconnect.mockRestore();
  });

  it("backs out of the confirm without disconnecting", async () => {
    const disconnect = spyOn(
      AuthApi,
      "disconnectGoogleConnection",
    ).mockResolvedValue(undefined);

    const user = userEvent.setup({ delay: null });
    renderHeader();

    await user.click(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(disconnect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    ).toBeInTheDocument();

    disconnect.mockRestore();
  });

  it("returns to the un-confirmed state when the disconnect fails", async () => {
    const disconnect = spyOn(
      AuthApi,
      "disconnectGoogleConnection",
    ).mockRejectedValue(new Error("nope"));

    const user = userEvent.setup({ delay: null });
    renderHeader();

    await user.click(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Confirm disconnecting ahab@pequod.com",
      }),
    );

    // A stuck "Disconnecting…" would read as a disconnect that half-happened.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
      ).toBeInTheDocument();
    });

    disconnect.mockRestore();
  });

  it("offers no disconnect for an account with no connection summary yet", () => {
    const { wrapper } = createStoreWrapper();
    render(
      <AccountSectionHeader
        accountEmail="ahab@pequod.com"
        connection={undefined}
      />,
      { wrapper },
    );

    expect(
      screen.queryByRole("button", { name: /^Disconnect/ }),
    ).not.toBeInTheDocument();
  });
});
