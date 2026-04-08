import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import { Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { RecurrenceSection } from "./RecurrenceSection";

const mockSetEvent = jest.fn();

const baseEvent = {
  _id: "1",
  title: "Test Event",
  description: "desc",
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 3600000).toISOString(),
  priority: Priorities.UNASSIGNED,
  isSomeday: false,
  user: "user1",
  recurrence: undefined,
  position: {} as any,
} as Schema_Event;

describe("RecurrenceSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without recurrence", () => {
    render(
      <RecurrenceSection
        bgColor="#fff"
        event={baseEvent}
        setEvent={mockSetEvent}
      />,
    );
    expect(screen.getByText(/Repeat/i)).toBeInTheDocument();
  });

  it("toggles recurrence on click", () => {
    render(
      <RecurrenceSection
        bgColor="#fff"
        event={baseEvent}
        setEvent={mockSetEvent}
      />,
    );
    const toggle = screen.getAllByText(/Repeat/i)[0];
    fireEvent.click(toggle);
    expect(mockSetEvent).toHaveBeenCalled();
  });

  it("renders repeat text when recurrence is set", () => {
    const eventWithRecurrence = {
      ...baseEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    } as Schema_Event;
    render(
      <RecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );
    expect(screen.getByText(/Repeat/i)).toBeInTheDocument();
  });

  it("renders recurrence controls when recurrence exists", () => {
    const eventWithRecurrence = {
      ...baseEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    } as Schema_Event;
    render(
      <RecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );
    expect(screen.getByText(/Every/i)).toBeInTheDocument();
    expect(screen.getAllByText("On:").length).toBeGreaterThan(0);
  });

  it("shows interval input and allows increment/decrement", () => {
    const eventWithRecurrence = {
      ...baseEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    } as Schema_Event;
    render(
      <RecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );
    // "Every" appears more than once, so use getAllByText
    const everyLabels = screen.getAllByText("Every");
    expect(everyLabels.length).toBeGreaterThan(0);
    everyLabels.forEach((label) => expect(label).toBeInTheDocument());
    // Find the first caret up button (increase)
    const upButton = screen.getAllByRole("button", { name: /increase interval/i })[0];
    fireEvent.click(upButton);
    expect(mockSetEvent).toHaveBeenCalled();
  });

  it("renders weekday selectors and toggles selection", () => {
    const eventWithRecurrence = {
      ...baseEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    } as Schema_Event;
    render(
      <RecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );
    // "On:" appears more than once, so use getAllByText
    const onLabels = screen.getAllByText("On:");
    expect(onLabels.length).toBeGreaterThan(0);
    onLabels.forEach((label) => expect(label).toBeInTheDocument());
    // Find weekday button by text
    const weekday = screen.getAllByText("M")[0];
    fireEvent.click(weekday);
    expect(mockSetEvent).toHaveBeenCalled();
  });

  it("renders end date picker", () => {
    const eventWithRecurrence = {
      ...baseEvent,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    } as Schema_Event;
    render(
      <RecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );
    // "Ends on:" appears more than once, so use getAllByText
    const endsOnLabels = screen.getAllByText("Ends on:");
    expect(endsOnLabels.length).toBeGreaterThan(0);
    endsOnLabels.forEach((label) => expect(label).toBeInTheDocument());
  });

  it("keeps recurrence controls visible when editing an event with recurrence", () => {
    const eventWithRecurrence = {
      ...baseEvent,
      recurrence: { rule: ["RRULE:FREQ=MONTHLY;COUNT=2"] },
    } as Schema_Event;

    render(
      <RecurrenceSection
        bgColor="#fff"
        event={eventWithRecurrence}
        setEvent={mockSetEvent}
      />,
    );

    expect(screen.getAllByText("Every").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ends on:").length).toBeGreaterThan(0);
  });

  // accessibility / FreqSelect keyboard interactions
  describe("FreqSelect keyboard interactions", () => {
    const setupRecurrence = () => {
      const eventWithRecurrence = {
        ...baseEvent,
        recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
      } as Schema_Event;
      render(
        <RecurrenceSection
          bgColor="#fff"
          event={eventWithRecurrence}
          setEvent={mockSetEvent}
        />,
      );
      return screen.getByRole("combobox", { name: /Recurrence frequency/i });
    };

    it("opens listbox with Space or Enter or ArrowDown", () => {
      const trigger = setupRecurrence();
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

      fireEvent.keyDown(trigger, { key: " " });
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

      fireEvent.keyDown(trigger, { key: "Enter" });
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      
      fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
      
      fireEvent.keyDown(trigger, { key: "ArrowDown" });
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("cycles options with arrow keys and selects with Enter/Space", () => {
      const trigger = setupRecurrence();
      fireEvent.keyDown(trigger, { key: "Enter" });
      
      const listbox = screen.getByRole("listbox");
      const options = screen.getAllByRole("option");
      
      // Focus starts at Week (index 1)
      fireEvent.keyDown(listbox, { key: "ArrowDown" }); // Move to Month
      fireEvent.keyDown(listbox, { key: "ArrowDown" }); // Move to Year
      fireEvent.keyDown(listbox, { key: "ArrowDown" }); // Move to Day (wrap around)
      
      fireEvent.keyDown(listbox, { key: "Enter" });
      
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(mockSetEvent).toHaveBeenCalled();
    });

    it("supports typeahead jumps", () => {
      const trigger = setupRecurrence();
      fireEvent.keyDown(trigger, { key: "Enter" });
      
      const listbox = screen.getByRole("listbox");
      
      // Type 'm' to jump to Month
      fireEvent.keyDown(listbox, { key: "m" });
      fireEvent.keyDown(listbox, { key: "Enter" });
      
      expect(mockSetEvent).toHaveBeenCalled();
    });
  });
});
