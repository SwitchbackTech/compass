import { act } from "react";
import "@testing-library/jest-dom/extend-expect";
import { screen, waitFor, within } from "@testing-library/react";
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
  const mockOnDelete = jest.fn();

  render(
    <div>
      <EventForm
        event={allDayEvent}
        isDraft={true}
        isExistingEvent={false}
        onClose={mockOnClose}
        onConvert={mockOnConvert}
        onSubmit={mockOnSubmit}
        setEvent={mockSetEvent}
        onDelete={mockOnDelete}
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

test("should call onConvert when meta+< (meta + shift + comma) keyboard shortcut is used", async () => {
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
        isDraft={false}
        isExistingEvent={true}
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
    // Simulate pressing & holding control then shift then left arrow

    await userEvent.keyboard("{Control>}{Meta>}{ArrowLeft}");
  });

  expect(mockOnConvert).toHaveBeenCalledTimes(1);

  expect(mockOnClose).not.toHaveBeenCalled();
  expect(mockOnSubmit).not.toHaveBeenCalled();
  expect(mockOnDelete).not.toHaveBeenCalled();
});

test("should call onDuplicate when meta+d keyboard shortcut is used", async () => {
  const sampleEvent: Schema_Event = {
    _id: "event123",
    title: "Test Event for Duplication",
    startDate: "2025-04-10",
    endDate: "2025-04-10",
    isAllDay: false,
  };
  const mockOnClose = jest.fn();
  const mockOnConvert = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockSetEvent = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnDuplicate = jest.fn();

  render(
    <div>
      <EventForm
        event={sampleEvent}
        isDraft={false}
        isExistingEvent={true}
        onClose={mockOnClose}
        onConvert={mockOnConvert}
        onSubmit={mockOnSubmit}
        setEvent={mockSetEvent}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
      />
    </div>,
  );

  // Ensure the form is rendered
  expect(screen.getByRole("form")).toBeInTheDocument();

  await act(async () => {
    // Simulate pressing Meta + d
    await userEvent.keyboard("{Meta>}d{/Meta}");
  });

  expect(mockOnDuplicate).toHaveBeenCalledTimes(1);
  expect(mockOnDuplicate).toHaveBeenCalledWith(sampleEvent);

  expect(mockOnClose).not.toHaveBeenCalled();
  expect(mockOnSubmit).not.toHaveBeenCalled();
  expect(mockOnDelete).not.toHaveBeenCalled();
  expect(mockOnConvert).not.toHaveBeenCalled();
});

test("should call duplicateEvent when duplicate icon btn is clicked", async () => {
  const user = userEvent.setup();

  const sampleEvent: Schema_Event = {
    _id: "event123",
    title: "Test Event for Duplication",
    startDate: "2025-04-10",
    endDate: "2025-04-10",
    isAllDay: false,
  };
  const mockOnClose = jest.fn();
  const mockOnConvert = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockSetEvent = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnDuplicate = jest.fn();

  render(
    <div>
      <EventForm
        event={sampleEvent}
        isDraft={false}
        isExistingEvent={true}
        onClose={mockOnClose}
        onConvert={mockOnConvert}
        onSubmit={mockOnSubmit}
        setEvent={mockSetEvent}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
      />
    </div>,
  );

  const eventForm = screen.getByRole("form");

  // Ensure the form is rendered (good sanity check)
  expect(eventForm).toBeInTheDocument();

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

  expect(mockOnDuplicate).toHaveBeenCalledTimes(1);
  expect(mockOnDuplicate).toHaveBeenCalledWith(sampleEvent);

  // the form waits for 120ms before calling onClose
  await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(clearTimeout(timeout)), 120);
  });

  expect(mockOnClose).toHaveBeenCalledTimes(1);
  expect(mockOnSubmit).not.toHaveBeenCalled();
  expect(mockOnDelete).not.toHaveBeenCalled();
  expect(mockOnConvert).not.toHaveBeenCalled();
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
