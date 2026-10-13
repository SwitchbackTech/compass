import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { mockModuleForFile } from "@web/__tests__/utils/mock-module.test.util";
import * as realAuthStateUtil from "@web/auth/compass/state/auth.state.util";
import * as realSignupFunnel from "@web/auth/posthog/signup-funnel";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import * as realAuthModal from "@web/components/AuthModal/hooks/useAuthModal";
import {
  ANONYMOUS_CALENDAR_ROW_TRIAL_MESSAGE,
  AnonymousCalendarRow,
} from "./AnonymousCalendarRow";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenModal = mock();
const mockTrackLocalModeSelected = mock();
const mockTrackSignupStartedAtClick = mock(
  async (_source: realSignupFunnel.SignupSource) => {},
);

beforeEach(() => {
  mockOpenModal.mockClear();
  mockTrackLocalModeSelected.mockClear();
  mockTrackSignupStartedAtClick.mockClear();
});

mockModuleForFile(
  "@web/components/AuthModal/hooks/useAuthModal",
  realAuthModal,
  { useAuthModal: () => ({ openModal: mockOpenModal }) },
);

mockModuleForFile("@web/auth/posthog/signup-funnel", realSignupFunnel, {
  trackLocalModeSelected: (
    ...args: Parameters<typeof realSignupFunnel.trackLocalModeSelected>
  ) => mockTrackLocalModeSelected(...args),
  trackSignupStartedAtClick: (
    ...args: Parameters<typeof realSignupFunnel.trackSignupStartedAtClick>
  ) => mockTrackSignupStartedAtClick(...args),
});

mockModuleForFile(
  "@web/auth/compass/state/auth.state.util",
  realAuthStateUtil,
  {
    shouldShowAnonymousCalendarChangeSignUpPrompt: () => false,
    subscribeToAuthState: (callback: () => void) => {
      callback();
      return () => {};
    },
  },
);

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

  it("renders the row with 'This browser' label and trial sync copy", () => {
    render(<AnonymousCalendarRow calendar={mockCalendar} />);

    expect(screen.getByText("This browser")).toBeInTheDocument();
    expect(ANONYMOUS_CALENDAR_ROW_TRIAL_MESSAGE).toBe(
      "Start your free trial to sync",
    );
    expect(screen.queryByText("Compass")).not.toBeInTheDocument();
    expect(screen.queryByText("primary")).not.toBeInTheDocument();
  });

  it("records local mode when the row is clicked without opening sign-up", async () => {
    const user = userEvent.setup();
    render(<AnonymousCalendarRow calendar={mockCalendar} />);

    const button = screen.getByRole("button", {
      name: "Start your free trial to save this calendar",
    });
    await user.click(button);

    expect(mockTrackLocalModeSelected).toHaveBeenCalledWith("anon_nudge");
    expect(mockTrackSignupStartedAtClick).not.toHaveBeenCalled();
    expect(mockOpenModal).not.toHaveBeenCalled();
  });

  it("starts signup from the tooltip trial CTA", async () => {
    const user = userEvent.setup();
    render(<AnonymousCalendarRow calendar={mockCalendar} />);

    await user.click(
      screen.getByRole("button", {
        name: "Start your free trial to save this calendar",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Start free trial" }));

    expect(mockTrackSignupStartedAtClick).toHaveBeenCalledWith("anon_nudge");
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
  });

  it("is keyboard accessible on the row without opening sign-up", async () => {
    const user = userEvent.setup();
    render(<AnonymousCalendarRow calendar={mockCalendar} />);

    const button = screen.getByRole("button", {
      name: "Start your free trial to save this calendar",
    });
    button.focus();
    await user.keyboard("{Enter}");

    expect(mockTrackLocalModeSelected).toHaveBeenCalledWith("anon_nudge");
    expect(mockOpenModal).not.toHaveBeenCalled();
  });

  it("displays the calendar's background color on the dot", () => {
    render(<AnonymousCalendarRow calendar={mockCalendar} />);

    const dot = screen
      .getByRole("button", {
        name: "Start your free trial to save this calendar",
      })
      .querySelector("span[aria-hidden]");

    expect(dot).toHaveStyle({
      backgroundColor: "#ffffff",
      borderColor: "#ffffff",
    });
  });
});
