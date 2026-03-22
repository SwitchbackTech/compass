import { act, renderHook } from "@testing-library/react";
import { useGoogleLogin as useGoogleLoginBase } from "@react-oauth/google";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";

jest.mock("@react-oauth/google", () => ({
  useGoogleLogin: jest.fn(),
}));

jest.mock("uuid", () => ({
  v4: () => "mock-anti-csrf-token",
}));

const mockUseGoogleLoginBase = useGoogleLoginBase as jest.MockedFunction<
  typeof useGoogleLoginBase
>;

describe("useGoogleLogin", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("routes popup-open failures through onError without throwing", () => {
    const popupError = new Error("Failed to open popup window");
    const baseLogin = jest.fn(() => {
      throw popupError;
    });
    const onError = jest.fn();

    mockUseGoogleLoginBase.mockReturnValue(baseLogin as never);

    const { result } = renderHook(() => useGoogleLogin({ onError }));

    expect(() => {
      act(() => {
        result.current.login();
      });
    }).not.toThrow();

    expect(onError).toHaveBeenCalledWith(popupError);
    expect(console.error).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("logs unexpected sync login errors and forwards them to onError", () => {
    const unexpectedError = new Error("Unexpected login failure");
    const baseLogin = jest.fn(() => {
      throw unexpectedError;
    });
    const onError = jest.fn();

    mockUseGoogleLoginBase.mockReturnValue(baseLogin as never);

    const { result } = renderHook(() => useGoogleLogin({ onError }));

    act(() => {
      result.current.login();
    });

    expect(console.error).toHaveBeenCalledWith(unexpectedError);
    expect(onError).toHaveBeenCalledWith(unexpectedError);
    expect(result.current.loading).toBe(false);
  });
});
