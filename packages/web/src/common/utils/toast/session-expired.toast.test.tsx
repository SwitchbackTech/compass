import { toast } from "react-toastify";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionExpiredToast } from "@web/common/utils/toast/session-expired.toast";

describe("SessionExpiredToast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders session-expired message and reconnect button", () => {
    render(
      <SessionExpiredToast
        onReconnect={jest.fn()}
        toastId="session-expired-api"
      />,
    );

    expect(
      screen.getByText(
        "Session expired. Please log in again to reconnect Google Calendar.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reconnect google calendar/i }),
    ).toBeInTheDocument();
  });

  it("triggers reconnect and dismisses toast when button is clicked", async () => {
    const onReconnect = jest.fn();
    const user = userEvent.setup();

    render(
      <SessionExpiredToast
        onReconnect={onReconnect}
        toastId="session-expired-api"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /reconnect google calendar/i }),
    );

    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(toast.dismiss).toHaveBeenCalledWith("session-expired-api");
  });
});
