import { renderHook, waitFor } from "@testing-library/react";
import { act, type MouseEvent } from "react";
import {
  userMetadataActions,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseSession = mock();
mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

const mockUpdateMetadata = mock();
mock.module("@web/api/user.api", () => ({
  UserApi: { updateMetadata: mockUpdateMetadata },
}));

// Mocking react-toastify directly here wouldn't help: showErrorToast and
// showStatusToast are themselves import-bound to react-toastify, and several
// sibling suites replace that package process-wide via mock.module without
// restoring it (see event.util.test.ts's comment on the same fragility) — so
// whichever suite's react-toastify binding got cached first inside those
// utils wins, regardless of what this file registers. Mocking the two util
// modules useSubscribeCmdItems.ts imports directly sidesteps that: the fresh
// cache-busted import below resolves them freshly against this file's mocks.
// Each mock captures the real function up front and delegates back to it
// (flag flipped off in afterAll) so status-toast.util.test.ts and any other
// direct consumer of these utils get the real implementation afterward.
const actualShowStatusToast = (
  await import("@web/common/utils/toast/status-toast.util")
).showStatusToast;
const mockShowStatusToast = mock();
let isStatusToastMocked = true;

mock.module("@web/common/utils/toast/status-toast.util", () => ({
  showStatusToast: (...args: Parameters<typeof actualShowStatusToast>) =>
    isStatusToastMocked
      ? mockShowStatusToast(...args)
      : actualShowStatusToast(...args),
}));

const actualShowErrorToast = (
  await import("@web/common/utils/toast/error-toast.util")
).showErrorToast;
const mockShowErrorToast = mock();
let isErrorToastMocked = true;

mock.module("@web/common/utils/toast/error-toast.util", () => ({
  showErrorToast: (...args: Parameters<typeof actualShowErrorToast>) =>
    isErrorToastMocked
      ? mockShowErrorToast(...args)
      : actualShowErrorToast(...args),
}));

afterAll(() => {
  isStatusToastMocked = false;
  isErrorToastMocked = false;
  // mock.module's useSession replacement is process-wide and never rebinds
  // once other files import it (see comment above), so whatever this file's
  // last-run test left mockUseSession returning leaks into every later
  // suite's first `useSession()` call — including calendar.query.ts's
  // authenticated branch, which then fires a real (unmocked) GET /calendars
  // and hangs those tests. Settle it back to the safe/default "signed out"
  // shape so later files see the same anon-mode behavior as if this file
  // never ran.
  mockUseSession.mockReturnValue({
    authenticated: false,
    setAuthenticated: () => {},
  });
});

// CommandPalette.tsx statically imports this hook, so bun's module cache may
// already hold a copy bound to whatever mocks were active whenever that file
// last ran (mock.module is process-wide and doesn't rebind already-evaluated
// importers). A cache-busting query string forces a fresh module evaluation
// bound to this file's own mocks above, matching useLoadProfile.test.ts.
async function importHook() {
  const moduleUrl = new URL(
    `./useSubscribeCmdItems.ts?test=${Math.random().toString(36).slice(2)}`,
    import.meta.url,
  );

  return import(moduleUrl.href) as Promise<
    typeof import("./useSubscribeCmdItems")
  >;
}

describe("useSubscribeCmdItems", () => {
  beforeEach(() => {
    mockUseSession.mockClear();
    mockUpdateMetadata.mockClear();
    mockShowStatusToast.mockClear();
    mockShowErrorToast.mockClear();
    userMetadataActions.clear();

    mockUseSession.mockReturnValue({ authenticated: true });
  });

  it("returns no items when unauthenticated", async () => {
    mockUseSession.mockReturnValue({ authenticated: false });
    const { useSubscribeCmdItems } = await importHook();

    const { result } = renderHook(() => useSubscribeCmdItems());

    expect(result.current).toEqual([]);
  });

  it("returns no items when already subscribed", async () => {
    userMetadataActions.set({ subscribeToUpdates: true });
    const { useSubscribeCmdItems } = await importHook();

    const { result } = renderHook(() => useSubscribeCmdItems());

    expect(result.current).toEqual([]);
  });

  it("shows a success toast and updates the store after subscribing", async () => {
    mockUpdateMetadata.mockResolvedValue({ subscribeToUpdates: true });
    const { useSubscribeCmdItems } = await importHook();

    const { result } = renderHook(() => useSubscribeCmdItems());
    const item = result.current.find(
      (item) => item.id === "subscribe-to-updates",
    );

    const mockEvent = {} as MouseEvent<HTMLButtonElement>;
    await act(async () => {
      item?.onClick?.(mockEvent);
    });

    await waitFor(() => {
      expect(mockShowStatusToast).toHaveBeenCalledWith(
        "subscribe-to-updates",
        "Subscribed to updates",
      );
    });
    expect(mockShowErrorToast).not.toHaveBeenCalled();
    expect(useUserMetadataStore.getState().current).toEqual({
      subscribeToUpdates: true,
    });
  });

  it("shows an error toast when subscribing fails", async () => {
    mockUpdateMetadata.mockRejectedValue(new Error("network error"));
    const { useSubscribeCmdItems } = await importHook();

    const { result } = renderHook(() => useSubscribeCmdItems());
    const item = result.current.find(
      (item) => item.id === "subscribe-to-updates",
    );

    const mockEvent = {} as MouseEvent<HTMLButtonElement>;
    await act(async () => {
      item?.onClick?.(mockEvent);
    });

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Couldn't subscribe to updates. Please try again.",
        { toastId: "subscribe-to-updates" },
      );
    });
    expect(mockShowStatusToast).not.toHaveBeenCalled();
  });
});
