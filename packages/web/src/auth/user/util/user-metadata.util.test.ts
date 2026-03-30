import { Status } from "@core/errors/status.codes";
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
  const api = UserApi as unknown as {
    getMetadata: jest.MockedFunction<typeof UserApi.getMetadata>;
  };
  const getDispatchMock = () =>
    store.dispatch as jest.MockedFunction<typeof store.dispatch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads metadata into the store", async () => {
    const metadata = {
      google: {
        connectionState: "HEALTHY" as const,
      },
    };
    api.getMetadata.mockResolvedValue(metadata);

    await refreshUserMetadata();

    expect(getDispatchMock()).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "userMetadata/setLoading" }),
    );
    expect(getDispatchMock()).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "userMetadata/set", payload: metadata }),
    );
    expect(getDispatchMock()).toHaveBeenCalledTimes(2);
  });

  it("starts background import state when metadata says full import is active", async () => {
    const metadata = {
      google: {
        connectionState: "IMPORTING" as const,
      },
      sync: {
        importGCal: "IMPORTING" as const,
      },
    };
    api.getMetadata.mockResolvedValue(metadata);

    await refreshUserMetadata();

    expect(getDispatchMock()).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ type: "async/importGCal/request" }),
    );
  });

  it("does not start background import state when Google is disconnected", async () => {
    const metadata = {
      google: {
        connectionState: "NOT_CONNECTED" as const,
      },
      sync: {
        importGCal: "RESTART" as const,
      },
    };
    api.getMetadata.mockResolvedValue(metadata);

    await refreshUserMetadata();

    expect(getDispatchMock()).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "async/importGCal/request" }),
    );
  });

  it("clears metadata when the request is unauthorized", async () => {
    api.getMetadata.mockRejectedValue({
      response: {
        status: Status.UNAUTHORIZED,
      },
    });

    await refreshUserMetadata();

    expect(getDispatchMock()).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "userMetadata/setLoading" }),
    );
    expect(getDispatchMock()).toHaveBeenNthCalledWith(
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

    expect(getDispatchMock()).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "userMetadata/setLoading" }),
    );
    expect(getDispatchMock()).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "userMetadata/finishLoading" }),
    );

    consoleErrorSpy.mockRestore();
  });
});
