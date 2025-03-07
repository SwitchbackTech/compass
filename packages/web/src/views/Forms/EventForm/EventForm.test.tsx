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
