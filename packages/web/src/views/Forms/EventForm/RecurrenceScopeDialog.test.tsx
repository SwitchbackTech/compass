import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Event } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { RecurringEventUpdateScope } from "@web/common/types/web.event.types";
import { editGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { RecurringEventUpdateScopeDialogContent } from "@web/views/Forms/EventForm/RecurrenceScopeDialog";
import { describe, expect, it, mock } from "bun:test";

// WP-04: a save whose guest set changed narrows the scope chooser to
// "All Events" — sync refuses attendee replacements at scope
// "this"/"thisAndFollowing", so those options must not be offered.

const seriesEvent = (overrides: Partial<Event> = {}): Event =>
  createMockEvent({
    content: {
      kind: "details",
      title: "Weekly sync",
      description: "",
      attendees: [
        {
          email: "guest@example.com",
          displayName: null,
          responseStatus: "accepted",
        },
      ],
    },
    recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
    ...overrides,
  });

const editDraftOrThrow = (event: Event) => {
  const draft = editGridEventDraft(event);
  if (!draft) throw new Error("expected an edit draft");
  return draft;
};

describe("RecurringEventUpdateScopeDialogContent guest narrowing", () => {
  it("offers every scope when the guest set is untouched", () => {
    render(
      <RecurringEventUpdateScopeDialogContent
        draft={editDraftOrThrow(seriesEvent())}
        onUpdateScopeChange={mock()}
        recurrenceChanged={false}
        setRecurrenceUpdateScopeDialogOpen={mock()}
      />,
    );

    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("narrows to All Events and explains why when the guest set changed", async () => {
    const user = userEvent.setup();
    const onUpdateScopeChange = mock();
    const draft = editDraftOrThrow(seriesEvent());
    draft.values.attendees = [
      { email: "guest@example.com", displayName: null },
      { email: "new-guest@example.com", displayName: null },
    ];

    render(
      <RecurringEventUpdateScopeDialogContent
        draft={draft}
        onUpdateScopeChange={onUpdateScopeChange}
        recurrenceChanged={false}
        setRecurrenceUpdateScopeDialogOpen={mock()}
      />,
    );

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(1);
    expect(
      screen.getByRole("radio", { name: RecurringEventUpdateScope.ALL_EVENTS }),
    ).toBeChecked();
    expect(
      screen.getByText("Guest changes apply to all events in the series."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ok" }));
    expect(onUpdateScopeChange).toHaveBeenCalledWith(
      RecurringEventUpdateScope.ALL_EVENTS,
    );
  });
});
