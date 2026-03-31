import { Status } from "@core/errors/status.codes";
import { resetGoogleSyncUIStateForTests } from "@web/auth/google/state/google.sync.state";
import { UserApi } from "@web/common/apis/user.api";
import { store } from "@web/store";
import { refreshUserMetadata } from "./user-metadata.util";

jest.mock("@web/common/apis/user.api", () => ({
  UserApi: {
    getMetadata: jest.fn(),
  },
}));

jest.mock("@web/store", () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

describe("refreshUserMetadata", () => {
  const api = UserApi as jest.Mocked<typeof UserApi>;
  const dispatch = store.dispatch as jest.MockedFunction<typeof store.dispatch>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetGoogleSyncUIStateForTests();
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

  it("does not trigger a client-side import when metadata says RESTART", async () => {
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

    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "userMetadata/set", payload: metadata }),
    );
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
