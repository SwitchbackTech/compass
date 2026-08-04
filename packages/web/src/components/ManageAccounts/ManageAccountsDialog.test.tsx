import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { AuthApi } from "@web/api/auth.api";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { ManageAccountsDialog } from "./ManageAccountsDialog";
import { describe, expect, it, mock, spyOn } from "bun:test";

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

const renderDialog = (
  connections: GoogleSyncConnectionSummary[] = [connection()],
) => {
  userMetadataActions.set({
    google: { connectionState: "HEALTHY", connections },
  });
  const { wrapper } = createStoreWrapper();
  return render(<ManageAccountsDialog isOpen onDismiss={mock()} />, {
    wrapper,
  });
};

describe("ManageAccountsDialog", () => {
  it("renders nothing while closed", () => {
    const { wrapper } = createStoreWrapper();
    render(<ManageAccountsDialog isOpen={false} onDismiss={mock()} />, {
      wrapper,
    });

    expect(screen.queryByText("Google accounts")).not.toBeInTheDocument();
  });

  it("lists every connected account with its own status", () => {
    renderDialog([
      connection(),
      connection({
        id: "connection-2",
        accountEmail: "ahab@gmail.com",
        state: "disconnected",
        connectionState: "RECONNECT_REQUIRED",
      }),
    ]);

    expect(screen.getByText("ahab@pequod.com")).toBeInTheDocument();
    expect(screen.getByText("ahab@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("Calendar connected")).toBeInTheDocument();
    expect(screen.getByText("Calendar needs reconnecting")).toBeInTheDocument();
  });

  it("asks for confirmation before disconnecting", async () => {
    const disconnect = spyOn(
      AuthApi,
      "disconnectGoogleConnection",
    ).mockResolvedValue(undefined);

    const user = userEvent.setup({ delay: null });
    renderDialog();

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
    renderDialog([connection({ id: "connection-second" })]);

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
    renderDialog();

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
    renderDialog();

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

  it("shows an empty state with no accounts connected", () => {
    renderDialog([]);

    expect(screen.getByText("No accounts connected yet.")).toBeInTheDocument();
  });

  it("dismisses via the Done button", async () => {
    const onDismiss = mock();
    userMetadataActions.set({
      google: { connectionState: "HEALTHY", connections: [connection()] },
    });
    const { wrapper } = createStoreWrapper();
    const user = userEvent.setup({ delay: null });
    render(<ManageAccountsDialog isOpen onDismiss={onDismiss} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
