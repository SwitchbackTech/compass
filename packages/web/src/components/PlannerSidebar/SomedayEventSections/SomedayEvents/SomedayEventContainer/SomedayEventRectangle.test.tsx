import { render, screen } from "@testing-library/react";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { type Props_DraftForm } from "@web/views/Week/components/Draft/context/DraftContext";
import { describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

import { SomedayEventRectangle } from "./SomedayEventRectangle";

// The component only reaches for the reference ref and reference props from the
// floating-ui form hook, so a minimal stub is enough to render it in isolation.
const formProps = {
  refs: { setReference: () => {} },
  getReferenceProps: () => ({}),
} as unknown as Props_DraftForm;

const createEvent = (overrides: Partial<Schema_Event> = {}): Schema_Event =>
  ({
    _id: "someday-1",
    isSomeday: true,
    title: "Read a book",
    ...overrides,
  }) as Schema_Event;

const renderRectangle = (event: Schema_Event) =>
  render(
    <SomedayEventRectangle
      category={Categories_Event.SOMEDAY_WEEK}
      event={event}
      formProps={formProps}
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
      createEvent({ recurrence: { rule: ["RRULE:FREQ=WEEKLY"] } }),
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
