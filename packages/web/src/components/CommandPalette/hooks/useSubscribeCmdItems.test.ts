import { act, renderHook, waitFor } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseSession = mock();
mockUseSession.mockReturnValue({
  authenticated: false,
  setAuthenticated: () => {},
});
mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

const actualUserApi = (await import("@web/api/user.api")).UserApi;
const mockGetEmailUpdates = mock();
const mockSubscribeToEmailUpdates = mock();
let isUserApiMocked = true;

mockGetEmailUpdates.mockResolvedValue({ status: "unavailable" });

mock.module("@web/api/user.api", () => ({
  UserApi: {
    ...actualUserApi,
    getEmailUpdates: (
      ...args: Parameters<typeof actualUserApi.getEmailUpdates>
    ) =>
      isUserApiMocked
        ? mockGetEmailUpdates(...args)
        : actualUserApi.getEmailUpdates(...args),
    subscribeToEmailUpdates: (
      ...args: Parameters<typeof actualUserApi.subscribeToEmailUpdates>
    ) =>
      isUserApiMocked
        ? mockSubscribeToEmailUpdates(...args)
        : actualUserApi.subscribeToEmailUpdates(...args),
  },
}));

afterAll(() => {
  isUserApiMocked = false;
  mockUseSession.mockReturnValue({
    authenticated: false,
    setAuthenticated: () => {},
  });
});

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
    mockGetEmailUpdates.mockClear();
    mockSubscribeToEmailUpdates.mockClear();
    mockGetEmailUpdates.mockResolvedValue({ status: "unavailable" });
    mockUseSession.mockReturnValue({ authenticated: true });
  });

  it("returns no items when unauthenticated", async () => {
    mockUseSession.mockReturnValue({ authenticated: false });
    const { useSubscribeCmdItems } = await importHook();

    const { result } = renderHook(() => useSubscribeCmdItems(true));

    expect(result.current).toEqual([]);
    expect(mockGetEmailUpdates).not.toHaveBeenCalled();
  });

  it("waits to fetch until the palette opens and shows a loading item", async () => {
    let resolveStatus!: (value: { status: "not_subscribed" }) => void;
    mockGetEmailUpdates.mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    const { useSubscribeCmdItems } = await importHook();

    const { result, rerender } = renderHook(
      ({ open }) => useSubscribeCmdItems(open),
      { initialProps: { open: false } },
    );

    expect(result.current).toEqual([]);
    rerender({ open: true });

    expect(result.current).toEqual([
      expect.objectContaining({
        disabled: true,
        label: "Checking email update status…",
      }),
    ]);
    expect(mockGetEmailUpdates).toHaveBeenCalledTimes(1);

    await act(async () => resolveStatus({ status: "not_subscribed" }));
  });

  it("hides the command when email updates are unavailable", async () => {
    mockGetEmailUpdates.mockResolvedValue({ status: "unavailable" });
    const { useSubscribeCmdItems } = await importHook();

    const { result } = renderHook(() => useSubscribeCmdItems(true));

    await waitFor(() => expect(result.current).toEqual([]));
  });

  it("shows a disabled subscribed item for an existing subscriber", async () => {
    mockGetEmailUpdates.mockResolvedValue({ status: "subscribed" });
    const { useSubscribeCmdItems } = await importHook();

    const { result } = renderHook(() => useSubscribeCmdItems(true));

    await waitFor(() => {
      expect(result.current).toEqual([
        expect.objectContaining({
          disabled: true,
          label: "You’re subscribed to updates",
        }),
      ]);
    });
  });

  it("subscribes a user who is not on the email list", async () => {
    mockGetEmailUpdates.mockResolvedValue({ status: "not_subscribed" });
    mockSubscribeToEmailUpdates.mockResolvedValue({ status: "subscribed" });
    const { useSubscribeCmdItems } = await importHook();

    const { result } = renderHook(() => useSubscribeCmdItems(true));

    await waitFor(() => {
      expect(result.current[0]?.label).toBe("Opt in to email updates");
    });
    await act(async () => {
      result.current[0]?.onClick?.();
    });

    await waitFor(() => {
      expect(result.current[0]?.label).toBe("You’re subscribed to updates");
    });
    expect(mockSubscribeToEmailUpdates).toHaveBeenCalledTimes(1);
  });

  it("shows the check failure and retries after reopening the palette", async () => {
    mockGetEmailUpdates
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ status: "not_subscribed" });
    const { useSubscribeCmdItems } = await importHook();

    const { result, rerender } = renderHook(
      ({ open }) => useSubscribeCmdItems(open),
      { initialProps: { open: true } },
    );

    await waitFor(() => {
      expect(result.current[0]?.label).toBe(
        "Couldn’t check email update status",
      );
    });
    rerender({ open: false });
    rerender({ open: true });

    await waitFor(() => {
      expect(result.current[0]?.label).toBe("Opt in to email updates");
    });
    expect(mockGetEmailUpdates).toHaveBeenCalledTimes(2);
  });
});
