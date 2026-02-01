import { renderHook } from "@testing-library/react";
import { useUser } from "@web/auth/hooks/useUser";
import { socket } from "../client/socket.client";
import { useSocketConnection } from "./useSocketConnection";

// Mock dependencies
jest.mock("@web/auth/hooks/useUser");
jest.mock("../client/socket.client", () => ({
  socket: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  },
}));

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

describe("useSocketConnection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("connects socket when user is authenticated and socket is disconnected", () => {
    mockUseUser.mockReturnValue({ userId: "test-user-id" });
    (socket as any).connected = false;

    renderHook(() => useSocketConnection());

    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it("does not connect socket when user is authenticated but socket is already connected", () => {
    mockUseUser.mockReturnValue({ userId: "test-user-id" });
    (socket as any).connected = true;

    renderHook(() => useSocketConnection());

    expect(socket.connect).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it("disconnects socket when user is not authenticated and socket is connected", () => {
    mockUseUser.mockReturnValue({ userId: null });
    (socket as any).connected = true;

    renderHook(() => useSocketConnection());

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it("does nothing when user is not authenticated and socket is already disconnected", () => {
    mockUseUser.mockReturnValue({ userId: null });
    (socket as any).connected = false;

    renderHook(() => useSocketConnection());

    expect(socket.connect).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
  });
});
