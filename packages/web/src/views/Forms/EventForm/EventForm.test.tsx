import React, { act } from "react";
import "@testing-library/jest-dom/extend-expect";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Schema_Event } from "@core/types/event.types";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { EventForm } from "./EventForm";

test("start date picker opens and then closes when clicking the end input", async () => {
  const allDayEvent: Schema_Event = {
    title: "Ski all day",
    startDate: "2025-01-01",
    endDate: "2025-01-02",
    isAllDay: true,
  };
  const mockOnClose = jest.fn();
  const mockOnConvert = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockSetEvent = jest.fn();

  render(
    <div>
      <EventForm
        event={allDayEvent}
        onClose={mockOnClose}
        onConvert={mockOnConvert}
        onSubmit={mockOnSubmit}
        setEvent={mockSetEvent}
      />
    </div>,
  );

  await _clickStartInput();

  // Check if the date picker is open
  expect(
    screen.getByRole("combobox", { name: /datepicker/i }),
  ).toBeInTheDocument();

  await _clickEndInput();

  // Check if the date picker is closed
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("should call onConvert when meta+< keyboard shortcut is used", async () => {
  const sampleEvent: Schema_Event = {
    _id: "event123",
    title: "Test Event for Hotkey",
    startDate: "2025-04-10",
    endDate: "2025-04-10",
    isAllDay: false,
  };
  const mockOnClose = jest.fn();
  const mockOnConvert = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockSetEvent = jest.fn();
  const mockOnDelete = jest.fn();

  render(
    <div>
      <EventForm
        event={sampleEvent}
        onClose={mockOnClose}
        onConvert={mockOnConvert}
        onSubmit={mockOnSubmit}
        setEvent={mockSetEvent}
        onDelete={mockOnDelete}
      />
    </div>,
  );

  // Ensure the form is rendered (optional, good sanity check)
  expect(screen.getByRole("form")).toBeInTheDocument();

  await act(async () => {
    // Simulate pressing Meta, then '<', then releasing them
    await userEvent.keyboard("{Meta>}{<}{/Meta}");
  });

  expect(mockOnConvert).toHaveBeenCalledTimes(1);

  expect(mockOnClose).not.toHaveBeenCalled();
  expect(mockOnSubmit).not.toHaveBeenCalled();
  expect(mockOnDelete).not.toHaveBeenCalled();
});

const _clickStartInput = async () => {
  const startDateInput = screen.getByRole("textbox", {
    name: /pick start date/i,
  });
  await act(async () => {
    await userEvent.click(startDateInput);
  });
};

const _clickEndInput = async () => {
  const endDateInput = screen.getByRole("textbox", {
    name: /pick end date/i,
  });
  await act(async () => {
    await userEvent.click(endDateInput);
  });
};
