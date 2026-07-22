import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import "@testing-library/jest-dom";

const deleteAccount = mock(async () => ({}) as never);
const clearAllBrowserStorage = mock(async () => {});
// jsdom's location is unconfigurable and its assign() only warns, so spy on
// it rather than replacing the object.
const assign = spyOn(window.location, "assign").mockImplementation(() => {});

mock.module("@web/api/user.api", () => ({ UserApi: { deleteAccount } }));
mock.module("@web/common/utils/cleanup/browser.cleanup.util", () => ({
  clearAllBrowserStorage,
}));
mock.module("@web/auth/compass/state/auth.state.util", () => ({
  getLastKnownEmail: () => "captain@example.com",
}));

const { DeleteAccountConfirmationProvider } =
  require("./DeleteAccountConfirmationProvider") as typeof import("./DeleteAccountConfirmationProvider");
const { useDeleteAccountConfirmation } =
  require("./hooks/useDeleteAccountConfirmation") as typeof import("./hooks/useDeleteAccountConfirmation");
const { DELETE_ACCOUNT_PHRASE } =
  require("./DeleteAccountConfirmationDialog") as typeof import("./DeleteAccountConfirmationDialog");

function Opener() {
  const { openDeleteAccountConfirmation } = useDeleteAccountConfirmation();
  return (
    <button type="button" onClick={openDeleteAccountConfirmation}>
      open
    </button>
  );
}

const confirmDeletion = async () => {
  const user = userEvent.setup();
  render(
    <DeleteAccountConfirmationProvider>
      <Opener />
    </DeleteAccountConfirmationProvider>,
  );

  await user.click(screen.getByRole("button", { name: "open" }));
  await user.type(screen.getByRole("textbox"), DELETE_ACCOUNT_PHRASE);
  await user.click(screen.getByRole("button", { name: "Delete account" }));
};

afterEach(() => {
  deleteAccount.mockClear();
  clearAllBrowserStorage.mockClear();
  assign.mockClear();
});

describe("DeleteAccountConfirmationProvider", () => {
  // Deleting spans a Mongo transaction and a Google grant revocation. The
  // farewell used to wait for that to finish, so the user sat looking at the
  // calendar of the account they'd just deleted with nothing to say it was
  // working.
  it("covers the calendar while the account is still being deleted", async () => {
    let finishDelete = () => {};
    deleteAccount.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishDelete = () => resolve({} as never);
        }) as never,
    );

    await confirmDeletion();

    // Still in flight: the request has not resolved yet.
    const farewell = await screen.findByRole("status");
    expect(farewell).toHaveTextContent(/so long captain@example.com/i);
    // aria-busy on a live region withholds the announcement until it flips
    // false, and this one never does - it lives until the reload, so a screen
    // reader user got silence where everyone else got the farewell.
    expect(farewell).not.toHaveAttribute("aria-busy");
    expect(assign).not.toHaveBeenCalled();

    // Resolve the one production timer immediately. This keeps the production
    // API unchanged and prevents a real timer from leaking into later files.
    const setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") callback();
      return 0;
    }) as typeof setTimeout);
    try {
      finishDelete();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(assign).toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it("takes the farewell back down if the account could not be deleted", async () => {
    deleteAccount.mockImplementationOnce(
      () => Promise.reject(new Error("nope")) as never,
    );

    await confirmDeletion();

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
    expect(assign).not.toHaveBeenCalled();
  });
});
