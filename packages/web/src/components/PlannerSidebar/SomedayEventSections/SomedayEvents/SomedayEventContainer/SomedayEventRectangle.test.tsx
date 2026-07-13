import { render, screen } from "@testing-library/react";
import { type Event, EventScheduleSchema } from "@core/types/event.contracts";
import { Categories_Event } from "@core/types/event.types";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

import { SomedayEventRectangle } from "./SomedayEventRectangle";

const createEvent = (overrides: Partial<Event> = {}): Event =>
  createMockEvent({
    content: { kind: "details", title: "Read a book", description: "" },
    schedule: EventScheduleSchema.parse({
      kind: "someday",
      period: "week",
      anchorDate: "2026-05-17",
      sortOrder: 0,
    }),
    ...overrides,
  });

const renderRectangle = (event: Event) =>
  render(
    <SomedayEventRectangle
      category={Categories_Event.SOMEDAY_WEEK}
      event={event}
      onMigrate={mock()}
    />,
  );

describe("SomedayEventRectangle", () => {
  it("shows migrate controls for a non-recurring someday event", () => {
    renderRectangle(createEvent());

    expect(
      screen.getByRole("button", { name: "Migrate to previous week" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Migrate to next week" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Recurring event")).not.toBeInTheDocument();
  });

  it("shows a passive repeat indicator instead of a migrate control for a recurring event", () => {
    renderRectangle(
      createEvent({
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
      }),
    );

    // The recurrence is announced, but there is no interactive migrate/warning
    // control and no "Can't migrate" affordance.
    expect(screen.getByLabelText("Recurring event")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /migrate/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/can't migrate recurring events/i),
    ).not.toBeInTheDocument();
  });
});
