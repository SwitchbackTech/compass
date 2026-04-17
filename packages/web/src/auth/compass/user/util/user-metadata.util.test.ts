import { Status } from "@core/errors/status.codes";
import { resetGoogleSyncUIStateForTests } from "@web/auth/google/state/google.sync.state";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

const mockDispatch = mock();
const mockGetMetadata = mock();

mock.module("@web/common/apis/user.api", () => ({
  UserApi: {
    getMetadata: mockGetMetadata,
  },
}));

mock.module("@web/store", () => ({
  store: {
    dispatch: mockDispatch,
  },
}));

const { refreshUserMetadata } =
  require("./user-metadata.util") as typeof import("./user-metadata.util");

describe("refreshUserMetadata", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockGetMetadata.mockClear();
    resetGoogleSyncUIStateForTests();
  });

  it("loads metadata into the store", async () => {
    const metadata = {
      google: {
        connectionState: "HEALTHY" as const,
      },
    };
    mockGetMetadata.mockResolvedValue(metadata);

    await refreshUserMetadata();

    expect(mockDispatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "userMetadata/setLoading" }),
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "userMetadata/set", payload: metadata }),
    );
    expect(mockDispatch).toHaveBeenCalledTimes(2);
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
    mockGetMetadata.mockResolvedValue(metadata);

    await refreshUserMetadata();
    await refreshUserMetadata();

    expect(mockDispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "userMetadata/set", payload: metadata }),
    );
  });

  it("clears metadata when the request is unauthorized", async () => {
    mockGetMetadata.mockRejectedValue({
      response: {
        status: Status.UNAUTHORIZED,
      },
    });

    await refreshUserMetadata();

    expect(mockDispatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "userMetadata/setLoading" }),
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "userMetadata/clear" }),
    );
  });

  it("finishes loading when the request fails unexpectedly", async () => {
    mockGetMetadata.mockRejectedValue(new Error("boom"));
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );

    await refreshUserMetadata();

    expect(mockDispatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "userMetadata/setLoading" }),
    );
    expect(mockDispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "userMetadata/finishLoading" }),
    );

    consoleErrorSpy.mockRestore();
  });
});
