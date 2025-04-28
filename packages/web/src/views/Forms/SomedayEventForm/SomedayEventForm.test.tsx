import React, { act } from "react";
import { toast } from "react-toastify";
import "@testing-library/jest-dom/extend-expect";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
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
const mockOnSubmit = jest.fn();
const mockSetEvent = jest.fn();

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
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
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
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
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
          onSubmit={mockOnSubmit}
          setEvent={mockSetEvent}
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
});
