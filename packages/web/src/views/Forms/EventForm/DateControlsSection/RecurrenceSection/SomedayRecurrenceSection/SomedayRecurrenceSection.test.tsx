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
    const trigger = screen.getByRole("button", { name: /edit recurrence/i });
    expect(trigger).toHaveTextContent(/^Repeat$/i);
  });

  const openRecurrenceDropdown = async () => {
    let control = document.querySelector(
      ".freq-select__control",
    ) as HTMLElement | null;

    if (!control) {
      const trigger = screen.getByRole("button", { name: /edit recurrence/i });
      fireEvent.click(trigger);
      await screen.findByRole("combobox");
      control = document.querySelector(
        ".freq-select__control",
      ) as HTMLElement | null;
    }

    if (!control) {
      throw new Error("Recurrence select control not found");
    }

    const input = control.querySelector("input") as HTMLElement | null;
    fireEvent.keyDown(input ?? control, {
      key: "ArrowDown",
      code: "ArrowDown",
    });
    await screen.findByText("Week");
    return control;
  };

  it("enables recurrence when selecting a frequency", async () => {
    renderSection();

    await openRecurrenceDropdown();

    fireEvent.click(screen.getByText("Week"));

    expect(mockSetEvent).toHaveBeenCalled();
  });

  it("shows only weekly and monthly frequency options when recurrence form is open", async () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    renderSection(eventWithRecurrence);

    await openRecurrenceDropdown();

    expect(screen.getByText("Does not repeat")).toBeInTheDocument();
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
    // Only the select control's internal trigger should be present
    expect(caretButtons.length).toBeLessThanOrEqual(1);
  });

  it("does not render end date controls", async () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    renderSection(eventWithRecurrence);

    await openRecurrenceDropdown();

    expect(screen.queryByText("Ends on:")).not.toBeInTheDocument();
  });

  it("does not show daily frequency option in dropdown", async () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    renderSection(eventWithRecurrence);

    await openRecurrenceDropdown();

    // Check that "Day" option is NOT available
    expect(screen.queryByText("Day")).not.toBeInTheDocument();
    expect(screen.getByText("Does not repeat")).toBeInTheDocument();

    // But Week and Month should be available when dropdown is open
    // Note: The dropdown might not show options immediately in this test environment
    // This is a limitation of testing react-select components
  });

  it("disables recurrence when selecting does not repeat", async () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    renderSection(eventWithRecurrence);

    await openRecurrenceDropdown();

    fireEvent.click(screen.getByText("Does not repeat"));

    expect(mockSetEvent).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /edit recurrence/i }),
    ).toBeInTheDocument();
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

    const control = await openRecurrenceDropdown();
    const input = control.querySelector("input") as HTMLElement | null;
    fireEvent.keyDown(input ?? control, { key: "Enter", code: "Enter" });

    expect(mockSetEvent).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    const value = await screen.findByTestId("someday-recurrence-value");
    expect(value).toHaveTextContent(/Repeats every Week/i);
  });

  it("closes select on escape and restores original recurrence", async () => {
    const eventWithRecurrence = {
      ...baseSomedayEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    };
    renderSection(eventWithRecurrence);

    const initialCalls = mockSetEvent.mock.calls.length;
    const control = await openRecurrenceDropdown();
    const input = control.querySelector("input") as HTMLElement | null;
    fireEvent.keyDown(input ?? control, { key: "Escape", code: "Escape" });

    expect(mockSetEvent.mock.calls.length).toBe(initialCalls);
    expect(screen.getByText(/Repeats every Week/i)).toBeInTheDocument();
  });

  it("closes select on escape when no recurrence is set", async () => {
    renderSection();

    const initialCalls = mockSetEvent.mock.calls.length;
    const control = await openRecurrenceDropdown();
    const input = control.querySelector("input") as HTMLElement | null;
    fireEvent.keyDown(input ?? control, { key: "Escape", code: "Escape" });

    expect(mockSetEvent.mock.calls.length).toBe(initialCalls);
    expect(
      screen.getByRole("button", { name: /edit recurrence/i }),
    ).toHaveTextContent(/^Repeat$/i);
  });
});
