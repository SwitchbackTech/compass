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

  const renderSection = (eventOverride: Schema_Event = baseSomedayEvent) => {
    const Wrapper = () => {
      const [event, setEvent] = React.useState<Schema_Event>(eventOverride);

      const handleSetEvent = React.useCallback(
        (update: React.SetStateAction<Schema_Event | null>) => {
          mockSetEvent(update);
          setEvent((prev) => {
            const next =
              typeof update === "function"
                ? (
                    update as (
                      value: Schema_Event | null,
                    ) => Schema_Event | null
                  )(prev)
                : update;

            return next ?? prev;
          });
        },
        [],
      );

      return (
        <SomedayRecurrenceSection
          bgColor="#fff"
          event={event}
          setEvent={handleSetEvent}
        />
      );
    };

    return render(<Wrapper />);
  };

  it("renders without recurrence", () => {
    renderSection();
    expect(screen.getByText(/Repeat/i)).toBeInTheDocument();
    const placeholder = screen.getByTestId("someday-recurrence-placeholder");
    expect(placeholder).toHaveAttribute("data-dimmed", "true");
  });

  const openRecurrenceDropdown = () => {
    const control = document.querySelector(
      ".freq-select__control",
    ) as HTMLElement | null;

    if (!control) {
      throw new Error("Recurrence select control not found");
    }

    fireEvent.mouseDown(control);
    return control;
  };

  it("enables recurrence when selecting a frequency", () => {
    renderSection();

    openRecurrenceDropdown();

    fireEvent.click(screen.getByText("Week"));

    expect(mockSetEvent).toHaveBeenCalled();
  });

  it("shows only weekly and monthly frequency options when recurrence form is open", () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    renderSection(eventWithRecurrence);

    openRecurrenceDropdown();

    expect(screen.getByText("Week")).toBeInTheDocument();
    expect(screen.getByText("Month")).toBeInTheDocument();
  });

  it("does not show weekday selectors for someday events", () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    renderSection(eventWithRecurrence);

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
    renderSection(eventWithRecurrence);

    // Check that "Every" interval controls are NOT present
    expect(screen.queryByText("Every")).not.toBeInTheDocument();

    // Check that caret buttons are NOT present
    const caretButtons = screen.queryAllByRole("button");
    // Only the select control's internal trigger (and optional clear button) should be present
    expect(caretButtons.length).toBeLessThanOrEqual(2);
  });

  it("does not render end date controls", () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    renderSection(eventWithRecurrence);

    openRecurrenceDropdown();

    expect(screen.queryByText("Ends on:")).not.toBeInTheDocument();
  });

  it("does not show daily frequency option in dropdown", () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    renderSection(eventWithRecurrence);

    openRecurrenceDropdown();

    // Check that "Day" option is NOT available
    expect(screen.queryByText("Day")).not.toBeInTheDocument();

    // But Week and Month should be available when dropdown is open
    // Note: The dropdown might not show options immediately in this test environment
    // This is a limitation of testing react-select components
  });

  it("selects highlighted option on enter without submitting form", async () => {
    const onSubmit = jest.fn();
    const FormWrapper = () => {
      const [event, setEvent] = React.useState<Schema_Event>(baseSomedayEvent);

      const handleSetEvent = React.useCallback(
        (update: React.SetStateAction<Schema_Event | null>) => {
          mockSetEvent(update);
          setEvent((prev) => {
            const next =
              typeof update === "function"
                ? (
                    update as (
                      value: Schema_Event | null,
                    ) => Schema_Event | null
                  )(prev)
                : update;
            return next ?? prev;
          });
        },
        [],
      );

      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <SomedayRecurrenceSection
            bgColor="#fff"
            event={event}
            setEvent={handleSetEvent}
          />
        </form>
      );
    };

    render(<FormWrapper />);

    const control = openRecurrenceDropdown();
    fireEvent.keyDown(control, { key: "Enter" });

    expect(mockSetEvent).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText(/Repeats every Week/i)).toBeInTheDocument();
  });
});
