import { toast } from "react-toastify";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useGoogleAuth } from "@web/auth/hooks/oauth/useGoogleAuth";
import { SessionExpiredToast } from "@web/common/utils/toast/session-expired.toast";

jest.mock("@web/auth/hooks/oauth/useGoogleAuth");

const mockUseGoogleAuth = useGoogleAuth as jest.MockedFunction<
  typeof useGoogleAuth
>;

describe("SessionExpiredToast", () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGoogleAuth.mockReturnValue({
      login: mockLogin,
      data: null,
      loading: false,
    });
  });

  it("renders session-expired message and reconnect button", () => {
    render(<SessionExpiredToast toastId="session-expired-api" />);

    expect(
      screen.getByText("Google Calendar connection expired. Please reconnect."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reconnect google calendar/i }),
    ).toBeInTheDocument();
  });

  it("triggers reconnect and dismisses toast when button is clicked", async () => {
    const user = userEvent.setup();

    render(<SessionExpiredToast toastId="session-expired-api" />);

    await user.click(
      screen.getByRole("button", { name: /reconnect google calendar/i }),
    );

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(toast.dismiss).toHaveBeenCalledWith("session-expired-api");
  });
});
