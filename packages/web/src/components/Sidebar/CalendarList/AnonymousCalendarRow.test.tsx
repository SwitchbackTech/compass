import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { AnonymousCalendarRow } from "./AnonymousCalendarRow";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenModal = mock();

beforeEach(() => {
  mockOpenModal.mockClear();
});

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: () => ({
    openModal: mockOpenModal,
  }),
}));

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  shouldShowAnonymousCalendarChangeSignUpPrompt: () => false,
  subscribeToAuthState: (callback: () => void) => {
    callback();
    return () => {};
  },
}));

describe("AnonymousCalendarRow", () => {
  const mockCalendar: Calendar = {
    id: CalendarIdSchema.parse(createObjectIdString()),
    name: "Compass",
    description: "",
    timeZone: null,
    foregroundColor: "#000000",
    backgroundColor: "#ffffff",
    provider: "local",
    access: "owner",
    capabilities: getCalendarCapabilities("owner"),
    isPrimary: true,
    isVisible: true,
    isActive: true,
  };

  it("renders the row with 'This browser' label and sign-up click handler", () => {
    render(<AnonymousCalendarRow calendar={mockCalendar} />);

    expect(screen.getByText("This browser")).toBeInTheDocument();
    expect(screen.queryByText("Compass")).not.toBeInTheDocument();
    expect(screen.queryByText("primary")).not.toBeInTheDocument();
  });

  it("opens sign-up modal when clicked", async () => {
    const user = userEvent.setup();
    render(<AnonymousCalendarRow calendar={mockCalendar} />);

    const button = screen.getByRole("button", {
      name: "Sign up to save this calendar",
    });
    await user.click(button);

    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
  });

  it("is keyboard accessible - opens sign-up on Enter", async () => {
    const user = userEvent.setup();
    render(<AnonymousCalendarRow calendar={mockCalendar} />);

    const button = screen.getByRole("button", {
      name: "Sign up to save this calendar",
    });
    button.focus();
    await user.keyboard("{Enter}");

    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
  });

  it("displays the calendar's background color on the dot", () => {
    render(<AnonymousCalendarRow calendar={mockCalendar} />);

    const dot = screen
      .getByRole("button", {
        name: "Sign up to save this calendar",
      })
      .querySelector("span[aria-hidden]");

    expect(dot).toHaveStyle({
      backgroundColor: "#ffffff",
      borderColor: "#ffffff",
    });
  });
});
