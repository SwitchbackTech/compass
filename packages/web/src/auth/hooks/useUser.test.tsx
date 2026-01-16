import { renderHook } from "@testing-library/react";
import { UserContext } from "../context/UserContext";
import { useUser } from "./useUser";

describe("useUser", () => {
  it("should return context value when used within UserProvider", () => {
    const mockUser = {
      userId: "user123",
      email: "test@example.com",
      isLoadingUser: false,
    };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserContext.Provider value={mockUser}>{children}</UserContext.Provider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current).toEqual(mockUser);
  });

  it("should throw error when used outside UserProvider", () => {
    // Suppress console.error for this test as it's expected to throw
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useUser());
    }).toThrow("useUser must be used within a UserProvider");

    consoleSpy.mockRestore();
  });
});
