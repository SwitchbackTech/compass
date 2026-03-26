import { act, renderHook } from "@testing-library/react";
import { useGoogleLogin as useGoogleLoginBase } from "@react-oauth/google";

jest.mock("@react-oauth/google", () => ({
  useGoogleLogin: jest.fn(),
}));

const mockUseGoogleLoginBase = useGoogleLoginBase as jest.MockedFunction<
  typeof useGoogleLoginBase
>;
const { useGoogleLogin } = jest.requireActual(
  "@web/components/oauth/google/useGoogleLogin",
) as typeof import("@web/components/oauth/google/useGoogleLogin");

describe("useGoogleLogin", () => {
  const mockOnStart = jest.fn();
  const mockOnError = jest.fn();
  const originalConsoleError = console.error;
  const originalAlert = window.alert;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    window.alert = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    window.alert = originalAlert;
  });

  it("handles synchronous popup-open failures without throwing", async () => {
    const popupOpenError = new Error("Failed to open popup window");

    mockUseGoogleLoginBase.mockImplementation(() => {
      return () => {
        throw popupOpenError;
      };
    });

    const { result } = renderHook(() =>
      useGoogleLogin({
        onStart: mockOnStart,
        onError: mockOnError,
      }),
    );

    await act(async () => {
      await result.current.login();
    });

    expect(mockOnStart).toHaveBeenCalledTimes(1);
    expect(mockOnError).toHaveBeenCalledWith(popupOpenError);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("logs unexpected synchronous login errors before forwarding", async () => {
    const unexpectedError = new Error("Unexpected oauth runtime error");

    mockUseGoogleLoginBase.mockImplementation(() => {
      return () => {
        throw unexpectedError;
      };
    });

    const { result } = renderHook(() =>
      useGoogleLogin({
        onStart: mockOnStart,
        onError: mockOnError,
      }),
    );

    await act(async () => {
      await result.current.login();
    });

    expect(mockOnError).toHaveBeenCalledWith(unexpectedError);
    expect(console.error).toHaveBeenCalledWith(unexpectedError);
  });
});
