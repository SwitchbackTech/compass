import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockInstance,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { type Props_DraftForm } from "@web/views/Calendar/components/Draft/context/DraftContext";
import { SomedayEventRectangle } from "./SomedayEventRectangle";

const mockFormProps: Props_DraftForm = {
  context: {} as any,
  refs: {
    setFloating: jest.fn(),
    setReference: jest.fn(),
  },
  strategy: "absolute" as const,
  x: 0,
  y: 0,
  getReferenceProps: () => ({}),
  getFloatingProps: () => ({}),
} as any;

const mockOnMigrate = jest.fn();

describe("SomedayEventRectangle - Repeat Icon", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("recurring event rendering", () => {
    it("should render repeat icon for base recurring event with rule", () => {
      const baseEvent = createMockBaseEvent({
        _id: "base-789",
        title: "Weekly Review",
      }) as Schema_Event;

      render(
        <SomedayEventRectangle
          category={Categories_Event.SOMEDAY_WEEK}
          event={baseEvent}
          formProps={mockFormProps}
          onMigrate={mockOnMigrate}
        />,
      );

      const icon = screen.getByLabelText("Recurring event");
      expect(icon).toBeInTheDocument();
      expect(screen.getByText("Weekly Review")).toBeInTheDocument();
    });

    it("should render repeat icon for recurring instance with eventId", () => {
      const baseEventId = "base-101";
      const gBaseId = "gbase-101";
      const instance = createMockInstance(baseEventId, gBaseId, {
        _id: "instance-2",
        title: "Weekly Review Instance",
      }) as Schema_Event;

      render(
        <SomedayEventRectangle
          category={Categories_Event.SOMEDAY_MONTH}
          event={instance}
          formProps={mockFormProps}
          onMigrate={mockOnMigrate}
        />,
      );

      const icon = screen.getByLabelText("Recurring event");
      expect(icon).toBeInTheDocument();
      expect(screen.getByText("Weekly Review Instance")).toBeInTheDocument();
    });

    it("should not render repeat icon for non-recurring someday event", () => {
      const event = createMockStandaloneEvent({
        _id: "standalone-3",
        title: "Read Book",
        recurrence: undefined,
      }) as Schema_Event;

      render(
        <SomedayEventRectangle
          category={Categories_Event.SOMEDAY_WEEK}
          event={event}
          formProps={mockFormProps}
          onMigrate={mockOnMigrate}
        />,
      );

      expect(
        screen.queryByLabelText("Recurring event"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Read Book")).toBeInTheDocument();
    });

    it("should not render repeat icon when recurrence is explicitly disabled", () => {
      const event = createMockStandaloneEvent({
        _id: "standalone-4",
        title: "One-time Task",
        recurrence: {
          rule: null,
          eventId: undefined,
        },
      }) as Schema_Event;

      render(
        <SomedayEventRectangle
          category={Categories_Event.SOMEDAY_MONTH}
          event={event}
          formProps={mockFormProps}
          onMigrate={mockOnMigrate}
        />,
      );

      expect(
        screen.queryByLabelText("Recurring event"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("One-time Task")).toBeInTheDocument();
    });
  });

  describe("migration controls", () => {
    it("should show migration arrows for non-recurring events", () => {
      const event = createMockStandaloneEvent({
        _id: "standalone-5",
        title: "Regular Task",
        recurrence: undefined,
      }) as Schema_Event;

      render(
        <SomedayEventRectangle
          category={Categories_Event.SOMEDAY_WEEK}
          event={event}
          formProps={mockFormProps}
          onMigrate={mockOnMigrate}
        />,
      );

      const arrows = screen.getAllByRole("button");
      expect(arrows).toHaveLength(2);
      expect(arrows[0]).toHaveTextContent("<");
      expect(arrows[1]).toHaveTextContent(">");
    });

    it("should show warning indicator for recurring events", () => {
      const baseEvent = createMockBaseEvent({
        _id: "base-202",
        title: "Recurring Task",
      }) as Schema_Event;

      render(
        <SomedayEventRectangle
          category={Categories_Event.SOMEDAY_WEEK}
          event={baseEvent}
          formProps={mockFormProps}
          onMigrate={mockOnMigrate}
        />,
      );

      const warning = screen.getByText("☝️");
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveAttribute(
        "title",
        "Can't migrate recurring events",
      );
    });
  });
});
