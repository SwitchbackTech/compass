import { Status } from "@core/errors/status.codes";
import { resetGoogleSyncUIStateForTests } from "@web/auth/google/google-sync-ui.state";
import { SyncApi } from "@web/common/apis/sync.api";
import { UserApi } from "@web/common/apis/user.api";
import { store } from "@web/store";
import { refreshUserMetadata } from "./user-metadata.util";

jest.mock("@web/common/apis/user.api", () => ({
  UserApi: {
    getMetadata: jest.fn(),
  },
}));

jest.mock("@web/common/apis/sync.api", () => ({
  SyncApi: {
    importGCal: jest.fn(),
  },
}));

jest.mock("@web/store", () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

describe("refreshUserMetadata", () => {
  const api = UserApi as jest.Mocked<typeof UserApi>;
  const syncApi = SyncApi as jest.Mocked<typeof SyncApi>;
  const dispatch = store.dispatch as jest.MockedFunction<typeof store.dispatch>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetGoogleSyncUIStateForTests();
    syncApi.importGCal.mockResolvedValue(undefined);
  });

  it("loads metadata into the store", async () => {
    const metadata = {
      google: {
        connectionState: "HEALTHY" as const,
      },
    };
    api.getMetadata.mockResolvedValue(metadata);

    await refreshUserMetadata();

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "userMetadata/setLoading" }),
    );
    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "userMetadata/set", payload: metadata }),
    );
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("triggers auto-import once when metadata says RESTART and Google is connected", async () => {
    const metadata = {
      google: {
        connectionState: "ATTENTION" as const,
      },
      sync: {
        importGCal: "RESTART" as const,
      },
    };
    api.getMetadata.mockResolvedValue(metadata);

    await refreshUserMetadata();
    await refreshUserMetadata();

    expect(syncApi.importGCal).toHaveBeenCalledTimes(1);
    expect(syncApi.importGCal).toHaveBeenCalledWith();
  });

  it("does not trigger auto-import when Google is disconnected", async () => {
    api.getMetadata.mockResolvedValue({
      google: {
        connectionState: "NOT_CONNECTED" as const,
      },
      sync: {
        importGCal: "RESTART" as const,
      },
    });

    await refreshUserMetadata();

    expect(syncApi.importGCal).not.toHaveBeenCalled();
  });

  it("resets the restart gate once metadata leaves RESTART", async () => {
    api.getMetadata
      .mockResolvedValueOnce({
        google: {
          connectionState: "ATTENTION" as const,
        },
        sync: {
          importGCal: "RESTART" as const,
        },
      })
      .mockResolvedValueOnce({
        google: {
          connectionState: "HEALTHY" as const,
        },
        sync: {
          importGCal: "COMPLETED" as const,
        },
      })
      .mockResolvedValueOnce({
        google: {
          connectionState: "ATTENTION" as const,
        },
        sync: {
          importGCal: "RESTART" as const,
        },
      });

    await refreshUserMetadata();
    await refreshUserMetadata();
    await refreshUserMetadata();

    expect(syncApi.importGCal).toHaveBeenCalledTimes(2);
  });

  it("clears metadata when the request is unauthorized", async () => {
    api.getMetadata.mockRejectedValue({
      response: {
        status: Status.UNAUTHORIZED,
      },
    });

    await refreshUserMetadata();

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "userMetadata/setLoading" }),
    );
    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "userMetadata/clear" }),
    );
  });

  it("finishes loading when the request fails unexpectedly", async () => {
    api.getMetadata.mockRejectedValue(new Error("boom"));
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await refreshUserMetadata();

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "userMetadata/setLoading" }),
    );
    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "userMetadata/finishLoading" }),
    );

    consoleErrorSpy.mockRestore();
  });
});
