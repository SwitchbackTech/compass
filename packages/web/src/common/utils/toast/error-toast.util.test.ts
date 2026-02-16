import { createElement, isValidElement } from "react";
import { toast } from "react-toastify";
import {
  ErrorToastSeverity,
  dismissErrorToast,
  showErrorToast,
  showSessionExpiredToast,
} from "@web/common/utils/toast/error-toast.util";

jest.mock("react-toastify", () => ({
  toast: {
    dismiss: jest.fn(),
    error: jest.fn(),
    isActive: jest.fn(),
  },
}));

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>;
const mockToastDismiss = toast.dismiss as jest.MockedFunction<
  typeof toast.dismiss
>;
const mockIsActive = toast.isActive as jest.MockedFunction<
  typeof toast.isActive
>;

describe("error-toast util", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToastError.mockReturnValue("toast-id");
    mockIsActive.mockReturnValue(false);
  });

  it("shows a default toast with standard behavior", () => {
    showErrorToast("A normal error occurred");

    expect(mockToastError).toHaveBeenCalledWith(
      "A normal error occurred",
      expect.objectContaining({
        autoClose: 5000,
        closeOnClick: true,
      }),
    );
  });

  it("accepts React components as toast content", () => {
    const content = createElement("span", null, "Custom toast content");

    showErrorToast(content);

    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(isValidElement(mockToastError.mock.calls[0][0])).toBe(true);
  });

  it("shows a critical toast that requires user interaction to close", () => {
    showErrorToast("A critical error occurred", {
      toastId: "critical-error",
      severity: ErrorToastSeverity.CRITICAL,
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "A critical error occurred",
      expect.objectContaining({
        toastId: "critical-error",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }),
    );
  });

  it("does not enqueue duplicate critical toasts when one is active", () => {
    mockIsActive.mockReturnValue(true);

    const toastId = showErrorToast("Session expired", {
      toastId: "session-expired-api",
      severity: ErrorToastSeverity.CRITICAL,
    });

    expect(toastId).toBe("session-expired-api");
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("dismisses an error toast by id", () => {
    dismissErrorToast("session-expired-api");

    expect(mockToastDismiss).toHaveBeenCalledWith("session-expired-api");
  });

  it("shows the session-expired toast as a component with critical options", () => {
    showSessionExpiredToast();

    expect(isValidElement(mockToastError.mock.calls[0][0])).toBe(true);
    expect(mockToastError).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        toastId: "session-expired-api",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }),
    );
  });
});
