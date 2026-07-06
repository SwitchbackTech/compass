import { renderHook, waitFor } from "@testing-library/react";
import { act, type MouseEvent } from "react";
import {
  userMetadataActions,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseSession = mock();
mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

const mockUpdateMetadata = mock();
mock.module("@web/common/apis/user.api", () => ({
  UserApi: { updateMetadata: mockUpdateMetadata },
}));

const toast = Object.assign(mock(), {
  error: mock(),
  update: mock(),
  isActive: mock(() => false),
});
mock.module("react-toastify", () => ({
  ToastContainer: () => null,
  toast,
}));

const { useSubscribeCmdItems } =
  require("./useSubscribeCmdItems") as typeof import("./useSubscribeCmdItems");

describe("useSubscribeCmdItems", () => {
  beforeEach(() => {
    mockUseSession.mockClear();
    mockUpdateMetadata.mockClear();
    toast.mockClear();
    toast.error.mockClear();
    toast.update.mockClear();
    userMetadataActions.clear();

    mockUseSession.mockReturnValue({ authenticated: true });
  });

  it("returns no items when unauthenticated", () => {
    mockUseSession.mockReturnValue({ authenticated: false });

    const { result } = renderHook(() => useSubscribeCmdItems());

    expect(result.current).toEqual([]);
  });

  it("returns no items when already subscribed", () => {
    userMetadataActions.set({ subscribeToUpdates: true });

    const { result } = renderHook(() => useSubscribeCmdItems());

    expect(result.current).toEqual([]);
  });

  it("shows a success toast and updates the store after subscribing", async () => {
    mockUpdateMetadata.mockResolvedValue({ subscribeToUpdates: true });

    const { result } = renderHook(() => useSubscribeCmdItems());
    const item = result.current.find(
      (item) => item.id === "subscribe-to-updates",
    );

    const mockEvent = {} as MouseEvent<HTMLButtonElement>;
    await act(async () => {
      item?.onClick?.(mockEvent);
    });

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        "Subscribed to updates",
        expect.objectContaining({ toastId: "subscribe-to-updates" }),
      );
    });
    expect(toast.error).not.toHaveBeenCalled();
    expect(useUserMetadataStore.getState().current).toEqual({
      subscribeToUpdates: true,
    });
  });

  it("shows an error toast when subscribing fails", async () => {
    mockUpdateMetadata.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useSubscribeCmdItems());
    const item = result.current.find(
      (item) => item.id === "subscribe-to-updates",
    );

    const mockEvent = {} as MouseEvent<HTMLButtonElement>;
    await act(async () => {
      item?.onClick?.(mockEvent);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't subscribe to updates. Please try again.",
        expect.objectContaining({ toastId: "subscribe-to-updates" }),
      );
    });
    expect(toast).not.toHaveBeenCalled();
  });
});
