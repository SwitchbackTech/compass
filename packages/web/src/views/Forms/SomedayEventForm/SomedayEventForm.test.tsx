import React, { act } from "react";
import { toast } from "react-toastify";
import "@testing-library/jest-dom/extend-expect";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Priorities } from "@core/constants/core.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { SomedayEventForm } from "./SomedayEventForm";

jest.mock("react-toastify", () => ({
  toast: jest.fn(),
}));

const mockDispatch = jest.fn();
jest.mock("@web/store/store.hooks", () => ({
  ...jest.requireActual("@web/store/store.hooks"),
  useAppDispatch: () => mockDispatch,
}));

const mockConfirm = jest.spyOn(window, "confirm");

const sampleSomedayEvent: Schema_Event = {
  _id: "someday123",
  title: "Test Someday Event for Hotkey",
  description: "Practice hotkeys",
  priority: Priorities.UNASSIGNED,
};

const mockOnClose = jest.fn();
const mockOnMigrate = jest.fn();
const mockOnSubmit = jest.fn();
const mockSetEvent = jest.fn();
const mockDuplicateEvent = jest.fn();

jest.mock(
  "@web/views/Calendar/components/Draft/context/useDraftContext",
  () => ({
    useDraftContext: () => ({
      actions: {
        duplicateEvent: mockDuplicateEvent,
      },
    }),
  }),
);

const defaultCategory = Categories_Event.SOMEDAY_WEEK;

describe("SomedayEventForm Hotkeys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should call onSubmit when enter keyboard shortcut is used", async () => {
    render(
      <div>
        <SomedayEventForm
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
      </div>,
    );

    // Ensure the form is rendered (good sanity check)
    expect(screen.getByRole("form")).toBeInTheDocument();

    await act(async () => {
      await userEvent.keyboard("{Enter}");
    });

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith(sampleSomedayEvent);

    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  test("should trigger delete flow when delete keyboard shortcut is used and confirmed", async () => {
    render(
      <div>
        <SomedayEventForm
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
      </div>,
    );

    expect(screen.getByRole("form")).toBeInTheDocument();

    // Explicitly confirm deletion
    mockConfirm.mockReturnValue(true);

    await act(async () => {
      await userEvent.keyboard("{Delete}");
    });

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledWith(
      `Delete ${sampleSomedayEvent.title}?`,
    );
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      getSomedayEventsSlice.actions.delete({ _id: sampleSomedayEvent._id }),
    );
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(`Deleted ${sampleSomedayEvent.title}`);

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test("should not trigger delete flow when delete keyboard shortcut is used and cancelled", async () => {
    render(
      <div>
        <SomedayEventForm
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
      </div>,
    );

    expect(screen.getByRole("form")).toBeInTheDocument();

    mockConfirm.mockReturnValue(false);

    await act(async () => {
      await userEvent.keyboard("{Delete}");
    });

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledWith(
      `Delete ${sampleSomedayEvent.title}?`,
    );

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test("should call duplicateEvent when duplicate icon btn is clicked", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SomedayEventForm
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
      </div>,
    );

    const form = screen.getByRole("form");

    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Duplicate Event")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Duplicate Event"));

    expect(mockDuplicateEvent).toHaveBeenCalledTimes(1);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  test("should call onMigrate when migrate backward icon btn is clicked", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SomedayEventForm
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
      </div>,
    );

    const form = screen.getByRole("form");

    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Migrate to previous week")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Migrate to previous week"));

    expect(mockOnMigrate).toHaveBeenCalledTimes(1);
    expect(mockOnMigrate).toHaveBeenCalledWith(
      sampleSomedayEvent,
      defaultCategory,
      "back",
    );
  });

  test("should call onMigrate when migrate forward icon btn is clicked", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <SomedayEventForm
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
      </div>,
    );

    const form = screen.getByRole("form");

    await act(async () => {
      await user.click(
        within(form).getByRole("button", { name: /open actions menu/i }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Migrate to next week")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Migrate to next week"));

    expect(mockOnMigrate).toHaveBeenCalledTimes(1);
    expect(mockOnMigrate).toHaveBeenCalledWith(
      sampleSomedayEvent,
      defaultCategory,
      "forward",
    );
  });

  /**
   * This test is skipped
   * The hotkey functionality is not implemented in the SomedayEventForm comp.
   */
  test.skip("should call duplicateEvent when meta+d keyboard shortcut is used", async () => {
    render(
      <div>
        <SomedayEventForm
          event={sampleSomedayEvent}
          onClose={mockOnClose}
          onMigrate={mockOnMigrate}
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
          category={defaultCategory}
        />
      </div>,
    );

    // Ensure the form is rendered (good sanity check)
    expect(screen.getByRole("form")).toBeInTheDocument();

    await act(async () => userEvent.keyboard("{Meta>}d{/Meta}"));

    expect(mockDuplicateEvent).toHaveBeenCalledTimes(1);

    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
