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

  it("triggers auto-import (not spinner) when RESTART and Google is connected", async () => {
    // RESTART means the backend wants a new import but hasn't started it yet.
    // The saga should be kicked off, but the spinner should NOT appear until
    // IMPORT_GCAL_START arrives — so we dispatch triggerAutoImport, not request.
    const metadata = {
      google: {
        connectionState: "HEALTHY" as const,
      },
      sync: {
        importGCal: "RESTART" as const,
      },
    };
    api.getMetadata.mockResolvedValue(metadata);

    await refreshUserMetadata();

    expect(getDispatchMock()).toHaveBeenCalledWith(
      expect.objectContaining({ type: "async/importGCal/triggerAutoImport" }),
    );
  });

  it("does not show spinner (request) for RESTART state — avoids false flicker", async () => {
    // Using request() for RESTART was the root cause of the spinner flicker bug:
    // every metadata refresh with a stale RESTART status re-showed the spinner.
    const metadata = {
      google: {
        connectionState: "HEALTHY" as const,
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

  it("does not trigger auto-import when RESTART but Google is not connected", async () => {
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
      expect.objectContaining({ type: "async/importGCal/triggerAutoImport" }),
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
