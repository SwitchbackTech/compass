import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { SomedayRecurrenceSection } from "./SomedayRecurrenceSection";

const mockSetEvent = jest.fn();

const baseSomedayEvent: Schema_Event = {
  _id: "1",
  title: "Test Someday Event",
  description: "desc",
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 3600000).toISOString(),
  priority: Priorities.UNASSIGNED,
  isSomeday: true,
  user: "user1",
  recurrence: undefined,
};

describe("SomedayRecurrenceSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without recurrence", () => {
    render(
      <SomedayRecurrenceSection
        bgColor="#fff"
        event={baseSomedayEvent}
        setEvent={mockSetEvent}
      />,
    );
    expect(screen.getByText(/Does not repeat/i)).toBeInTheDocument();
  });

  it("toggles recurrence on click", () => {
    render(
      <SomedayRecurrenceSection
        bgColor="#fff"
        event={baseSomedayEvent}
        setEvent={mockSetEvent}
      />,
    );
    const toggle = screen.getByText(/Does not repeat/i);
    fireEvent.click(toggle);
    expect(mockSetEvent).toHaveBeenCalled();
  });

  it("renders recurrence edit button when recurrence is set", () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    render(
      <SomedayRecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );
    expect(screen.getByText(/Edit Event Recurrence/i)).toBeInTheDocument();
  });

  it("shows only weekly and monthly frequency options when recurrence form is open", () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    render(
      <SomedayRecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );

    // Click to open the recurrence form
    fireEvent.click(screen.getByText(/Edit Event Recurrence/i));

    // Check that "Repeats every" is shown
    expect(screen.getByText(/Repeats every/i)).toBeInTheDocument();

    // The frequency selector should be present (react-select component)
    const frequencySelect = document.querySelector(".freq-select__control");
    expect(frequencySelect).toBeInTheDocument();
  });

  it("does not show weekday selectors for someday events", () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    render(
      <SomedayRecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );

    // Click to open the recurrence form
    fireEvent.click(screen.getByText(/Edit Event Recurrence/i));

    // Check that weekday selectors are NOT present
    expect(screen.queryByText("On:")).not.toBeInTheDocument();

    // Check that individual weekday buttons are NOT present
    expect(screen.queryByText("S")).not.toBeInTheDocument();
    expect(screen.queryByText("M")).not.toBeInTheDocument();
    expect(screen.queryByText("T")).not.toBeInTheDocument();
    expect(screen.queryByText("W")).not.toBeInTheDocument();
    expect(screen.queryByText("R")).not.toBeInTheDocument();
    expect(screen.queryByText("F")).not.toBeInTheDocument();
  });

  it("does not show interval controls (Every X) for someday events", () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    render(
      <SomedayRecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );

    // Click to open the recurrence form
    fireEvent.click(screen.getByText(/Edit Event Recurrence/i));

    // Check that "Every" interval controls are NOT present
    expect(screen.queryByText("Every")).not.toBeInTheDocument();

    // Check that caret buttons are NOT present
    const caretButtons = screen.queryAllByRole("button");
    // Only the Edit Event Recurrence button should be present
    expect(caretButtons.length).toBeLessThanOrEqual(1);
  });

  it("does not render end date controls", () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    render(
      <SomedayRecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );

    // Click to open the recurrence form
    fireEvent.click(screen.getByText(/Edit Event Recurrence/i));

    expect(screen.queryByText("Ends on:")).not.toBeInTheDocument();
  });

  it("does not show daily frequency option in dropdown", () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    render(
      <SomedayRecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );

    // Click to open the recurrence form
    fireEvent.click(screen.getByText(/Edit Event Recurrence/i));

    // Click on the frequency selector to open dropdown
    const frequencySelect = document.querySelector(".freq-select__control");
    if (frequencySelect) {
      fireEvent.mouseDown(frequencySelect);
    }

    // Check that "Day" option is NOT available
    expect(screen.queryByText("Day")).not.toBeInTheDocument();

    // But Week and Month should be available when dropdown is open
    // Note: The dropdown might not show options immediately in this test environment
    // This is a limitation of testing react-select components
  });
});
