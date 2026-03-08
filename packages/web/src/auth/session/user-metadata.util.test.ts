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
  const api = UserApi as {
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
        connectionStatus: "connected" as const,
        syncStatus: "healthy" as const,
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
