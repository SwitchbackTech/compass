import React, { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CLIMB, EUROPE_TRIP } from "@core/__mocks__/v1/events/events.misc";
import {
  findAndUpdateEventInPreloadedState,
  freshenEventStartEndDate,
} from "@web/__tests__/Calendar/calendar.render.test.utils";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { CalendarView } from "@web/views/Calendar";

jest.mock("@web/views/Calendar/hooks/mouse/useEventListener", () => ({
  useEventListener: jest.fn(),
}));

describe("Event Form", () => {
  it("closes after clicking outside", async () => {
    render(<CalendarView />, { state: preloadedState });
    const user = userEvent.setup();

    await act(async () => {
      const climbBtn = document.querySelector(
        `[data-event-id="${CLIMB._id}"]`,
      ) as HTMLElement;
      await user.click(climbBtn);
    });

    await act(async () => {
      await user.click(document.body);
    });

    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
  it("closes after clicking trash icon", async () => {
    const user = userEvent.setup();
    render(<CalendarView />, {
      state: findAndUpdateEventInPreloadedState(
        preloadedState,
        EUROPE_TRIP._id as string,
        freshenEventStartEndDate,
      ),
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Europe Trip < >" }));
    });

    const form = screen.getByRole("form");

    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });
  }, 10000);
  describe("DatePicker", () => {
    it("does not open dialog by default", async () => {
      const user = userEvent.setup();
      const { container } = render(<CalendarView />, { state: preloadedState });

      await act(async () => {
        const climbBtn = document.querySelector(
          `[data-event-id="${CLIMB._id}"]`,
        ) as HTMLElement;
        await user.click(climbBtn);
      });

      expect(container.getElementsByClassName("startDatePicker")).toHaveLength(
        0,
      );
    });
  });

  describe("HeaderNote", () => {
    it("it should be focused when the 'f' keyboard shortcut is used", async () => {
      const { container } = render(<CalendarView />, { state: preloadedState });

      const focusNotePlaceholder = screen.getByText("Click to add your focus");

      expect(focusNotePlaceholder).toBeInTheDocument();

      await act(async () => userEvent.keyboard("f"));

      const focusNoteInput = container.querySelector('[id="headerNoteInput"]');

      expect(focusNoteInput).toHaveFocus();
    });

    it.skip("it should be focused when the 'edit focus' btn is clicked in the command palette", async () => {
      const { container } = render(<CalendarView />, { state: preloadedState });

      const focusNotePlaceholder = screen.getByText("Click to add your focus");

      expect(focusNotePlaceholder).toBeInTheDocument();

      await act(async () => userEvent.keyboard("{Meta>}k{/Meta}"));

      const cmdPaletteEditBtn = screen.getByText("Edit Focus Note [f]");

      expect(cmdPaletteEditBtn).toBeInTheDocument();

      await act(async () => userEvent.click(cmdPaletteEditBtn!));

      const focusNoteInput = container.querySelector('[id="headerNoteInput"]');

      expect(focusNoteInput).toHaveFocus();
    });
  });
});
