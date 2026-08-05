import { renderHook } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const actualUseConnectGoogle = (
  await import("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle")
).useConnectGoogle;
let isConnectGoogleMocked = true;
const mockUseConnectGoogle = mock();
mock.module("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: (...args: Parameters<typeof actualUseConnectGoogle>) =>
    isConnectGoogleMocked
      ? mockUseConnectGoogle(...args)
      : actualUseConnectGoogle(...args),
}));

afterAll(() => {
  isConnectGoogleMocked = false;
});

const { useAddAccountCmdItems } = await import("./useAddAccountCmdItems");

describe("useAddAccountCmdItems", () => {
  beforeEach(() => {
    mockUseConnectGoogle.mockReset();
  });

  it("returns no items when Google is not yet available", () => {
    mockUseConnectGoogle.mockReturnValue({
      connect: mock(),
      isAvailable: false,
      isConnecting: false,
      state: "HEALTHY",
    });

    const { result } = renderHook(() => useAddAccountCmdItems());

    expect(result.current).toEqual([]);
  });

  it("offers the item before any account is connected - one way to discover Google in the palette", () => {
    mockUseConnectGoogle.mockReturnValue({
      connect: mock(),
      isAvailable: true,
      isConnecting: false,
      state: "NOT_CONNECTED",
    });

    const { result } = renderHook(() => useAddAccountCmdItems());

    expect(result.current[0].label).toBe("Add account");
  });

  it("still offers the item while an existing account needs reconnecting - matches Settings' gate, which doesn't hide Add account either", () => {
    mockUseConnectGoogle.mockReturnValue({
      connect: mock(),
      isAvailable: true,
      isConnecting: false,
      state: "RECONNECT_REQUIRED",
    });

    const { result } = renderHook(() => useAddAccountCmdItems());

    expect(result.current[0].label).toBe("Add account");
  });

  it("connects another account from the command palette item once one account is healthy", () => {
    const connect = mock();
    mockUseConnectGoogle.mockReturnValue({
      connect,
      isAvailable: true,
      isConnecting: false,
      state: "HEALTHY",
    });

    const { result } = renderHook(() => useAddAccountCmdItems());

    expect(result.current[0].label).toBe("Add account");

    result.current[0].onClick?.();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("disables the item while a connect is already in flight", () => {
    mockUseConnectGoogle.mockReturnValue({
      connect: mock(),
      isAvailable: true,
      isConnecting: true,
      state: "IMPORTING",
    });

    const { result } = renderHook(() => useAddAccountCmdItems());

    expect(result.current[0].disabled).toBe(true);
  });
});
