import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastCloseButton } from "@web/common/utils/toast/ToastCloseButton";
import { describe, expect, it, mock } from "bun:test";

describe("ToastCloseButton", () => {
  it("shows an Esc keycap and dismisses on click", async () => {
    const closeToast = mock();
    const user = userEvent.setup();
    render(
      <ToastCloseButton
        ariaLabel="Dismiss"
        closeToast={closeToast}
        theme="dark"
        type="error"
      />,
    );

    const button = screen.getByRole("button", { name: "Dismiss" });
    expect(within(button).getByText("Esc")).toBeTruthy();

    await user.click(button);
    expect(closeToast).toHaveBeenCalled();
  });
});
