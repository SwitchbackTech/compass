import { waitFor } from "@testing-library/react";
import { authSlice } from "@web/ducks/auth/slices/auth.slice";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { act } from "react";

describe("SessionProvider sessionInit", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("refreshes user metadata when a session already exists", async () => {
    const refreshUserMetadata = jest.fn().mockResolvedValue(undefined);
    const openStream = jest.fn();
    const closeStream = jest.fn();
    const getStream = jest.fn().mockReturnValue(null);
    const dispatch = jest.fn();
    const markUserAsAuthenticated = jest.fn();
    const getLastKnownEmail = jest.fn().mockReturnValue("test@example.com");

    jest.doMock("@web/auth/compass/user/util/user-metadata.util", () => ({
      refreshUserMetadata,
    }));
    jest.doMock("@web/sse/provider/SSEProvider", () => ({
      openStream,
      closeStream,
      getStream,
    }));
    jest.doMock("@web/store", () => ({
      store: {
        dispatch,
      },
    }));
    jest.doMock("@web/auth/compass/state/auth.state.util", () => ({
      getLastKnownEmail,
      markUserAsAuthenticated,
    }));

    await jest.isolateModulesAsync(async () => {
      const { session } = await import("@web/common/classes/Session");
      const { sessionInit } = await import("./SessionProvider");

      (session.doesSessionExist as jest.Mock).mockResolvedValue(true);

      sessionInit();

      await waitFor(() => {
        expect(markUserAsAuthenticated).toHaveBeenCalledWith(
          "test@example.com",
        );
        expect(refreshUserMetadata).toHaveBeenCalledTimes(1);
      });
      expect(openStream).toHaveBeenCalledTimes(1);
    });
  });

  it("refreshes metadata on session creation and clears it on sign out", async () => {
    const refreshUserMetadata = jest.fn().mockResolvedValue(undefined);
    const openStream = jest.fn();
    const closeStream = jest.fn();
    const getStream = jest.fn().mockReturnValue({} as EventSource); // stream already open
    const dispatch = jest.fn();
    const markUserAsAuthenticated = jest.fn();
    const getLastKnownEmail = jest.fn().mockReturnValue("test@example.com");

    jest.doMock("@web/auth/compass/user/util/user-metadata.util", () => ({
      refreshUserMetadata,
    }));
    jest.doMock("@web/sse/provider/SSEProvider", () => ({
      openStream,
      closeStream,
      getStream,
    }));
    jest.doMock("@web/store", () => ({
      store: {
        dispatch,
      },
    }));
    jest.doMock("@web/auth/compass/state/auth.state.util", () => ({
      getLastKnownEmail,
      markUserAsAuthenticated,
    }));

    await jest.isolateModulesAsync(async () => {
      const { session } = await import("@web/common/classes/Session");
      const { sessionInit } = await import("./SessionProvider");

      (session.doesSessionExist as jest.Mock).mockResolvedValue(false);

      sessionInit();

      session.emit("SESSION_CREATED", { action: "SESSION_CREATED" } as never);

      await waitFor(() => {
        expect(markUserAsAuthenticated).toHaveBeenCalledWith(
          "test@example.com",
        );
        expect(refreshUserMetadata).toHaveBeenCalledTimes(1);
      });
      // closeStream + openStream both called for SESSION_CREATED
      expect(closeStream).toHaveBeenCalledTimes(1);
      expect(openStream).toHaveBeenCalledTimes(1);

      session.emit("SIGN_OUT", { action: "SIGN_OUT" } as never);

      expect(dispatch).toHaveBeenCalledWith(authSlice.actions.resetAuth());
      expect(dispatch).toHaveBeenCalledWith(
        userMetadataSlice.actions.clear(undefined),
      );
      expect(closeStream).toHaveBeenCalledTimes(2);
    });
  });
});
