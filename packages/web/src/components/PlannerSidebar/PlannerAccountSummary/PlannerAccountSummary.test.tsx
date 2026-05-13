import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenModal = mock();
let mockEmail: string | undefined;

mock.module("@web/auth/compass/user/hooks/useUser", () => ({
  useUser: () => ({
    email: mockEmail,
  }),
}));

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: () => ({
    openModal: mockOpenModal,
  }),
}));

mock.module("@phosphor-icons/react", () => ({
  InfoIcon: () => <span aria-hidden="true">info</span>,
}));

const { PlannerAccountSummary } =
  require("./PlannerAccountSummary") as typeof import("./PlannerAccountSummary");

describe("PlannerAccountSummary", () => {
  beforeEach(() => {
    mockEmail = undefined;
    mockOpenModal.mockClear();
  });

  it("shows a sign up prompt for temporary accounts", async () => {
    const user = userEvent.setup();

    render(<PlannerAccountSummary />);

    await user.click(
      screen.getByRole("button", {
        name: "Temporary account. Sign up to save changes",
      }),
    );

    expect(screen.getByText("Temporary account")).toBeTruthy();
    expect(screen.getByText("Sign up")).toBeTruthy();
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
  });

  it("shows a plain account identity for authenticated accounts", () => {
    mockEmail = "ugur@example.com";

    render(<PlannerAccountSummary />);

    expect(screen.getByText("ugur@example.com")).toBeTruthy();
    expect(screen.queryByText("Changes saved")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
