import { useContext } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { syncLocalTaskUsersToAuthenticatedUser } from "@web/common/utils/sync/local-task-user-sync.util";
import { SessionContext, SessionProvider } from "./SessionProvider";

jest.mock("@web/common/utils/sync/local-task-user-sync.util");

function SessionTestHarness() {
  const { setAuthenticated } = useContext(SessionContext);

  return (
    <div>
      <button onClick={() => setAuthenticated(true)} type="button">
        Set Authenticated
      </button>
      <button onClick={() => setAuthenticated(false)} type="button">
        Set Unauthenticated
      </button>
    </div>
  );
}

describe("SessionProvider", () => {
  const mockSyncLocalTaskUsersToAuthenticatedUser =
    syncLocalTaskUsersToAuthenticatedUser as jest.MockedFunction<
      typeof syncLocalTaskUsersToAuthenticatedUser
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncLocalTaskUsersToAuthenticatedUser.mockResolvedValue(0);
  });

  it("does not sync task users when authenticated is false", () => {
    render(
      <SessionProvider>
        <SessionTestHarness />
      </SessionProvider>,
    );

    expect(mockSyncLocalTaskUsersToAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("syncs task users when authenticated becomes true", async () => {
    render(
      <SessionProvider>
        <SessionTestHarness />
      </SessionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Set Authenticated" }));

    await waitFor(() => {
      expect(mockSyncLocalTaskUsersToAuthenticatedUser).toHaveBeenCalledTimes(
        1,
      );
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Set Unauthenticated" }),
    );
  });
});
