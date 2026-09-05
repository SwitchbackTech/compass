import { HotkeyManager } from "@tanstack/react-hotkeys";
import { render, screen } from "@testing-library/react";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import { type Attendee } from "@core/types/event-attendance.contracts";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { editGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// WP-08 RSVP-control gating: Going / Maybe / Decline shows exactly when the
// calendar's connected account email appears in the attendee list (organizer
// included), regardless of calendar writability — and never on local events
// or events the user is not invited to.

const ACCOUNT_EMAIL = "me@example.com";

const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Work calendar",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "google",
  access: "owner",
  capabilities: getCalendarCapabilities("owner"),
  isPrimary: true,
  isVisible: true,
  isActive: true,
  accountEmail: ACCOUNT_EMAIL,
  ...overrides,
});

const selfAttendee: Attendee = {
  // Case-differing on purpose: the self match is case-insensitive.
  email: "Me@Example.com",
  displayName: null,
  responseStatus: "needsAction",
};

const otherAttendee: Attendee = {
  email: "guest@example.com",
  displayName: "Guest One",
  responseStatus: "accepted",
};

const makeInvitedEvent = (
  calendarId: Calendar["id"],
  overrides: Partial<Event> = {},
): Event =>
  createMockEvent({
    calendarId,
    content: {
      kind: "details",
      title: "Team offsite",
      description: "",
      organizer: { email: "organizer@example.com", displayName: null },
      attendees: [selfAttendee, otherAttendee],
    },
    ...overrides,
  });

const renderEventForm = (draft: GridEventDraft, calendars: Calendar[]) => {
  const { queryClient, wrapper } = createStoreWrapper();
  queryClient.setQueryData(calendarQueryKeys.all, calendars);

  return render(
    <EventForm
      draft={draft}
      isDraft={false}
      isExistingEvent={true}
      onClose={mock()}
      onDelete={mock()}
      onDuplicate={mock()}
      onSubmit={mock()}
      setDraft={mock()}
    />,
    { wrapper },
  );
};

const editDraftOrThrow = (event: Event): GridEventDraft => {
  const draft = editGridEventDraft(event);
  if (!draft) throw new Error("expected an edit draft");
  return draft;
};

const queryRsvpGroup = () =>
  screen.queryByRole("radiogroup", { name: "Going?" });

describe("EventForm RSVP control gating", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
  });

  it("shows the control when the account email is an attendee on a Google calendar", () => {
    const calendar = makeCalendar();
    renderEventForm(editDraftOrThrow(makeInvitedEvent(calendar.id)), [
      calendar,
    ]);

    expect(queryRsvpGroup()).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Going" })).toBeInTheDocument();
  });

  it("shows the control on a microsoft calendar the same way", () => {
    const calendar = makeCalendar({ provider: "microsoft" });
    renderEventForm(editDraftOrThrow(makeInvitedEvent(calendar.id)), [
      calendar,
    ]);

    expect(queryRsvpGroup()).toBeInTheDocument();
  });

  it("shows the control on a viewer-access (read-only) calendar — RSVP is not a calendar write", () => {
    const calendar = makeCalendar({
      access: "reader",
      capabilities: getCalendarCapabilities("reader"),
    });
    renderEventForm(editDraftOrThrow(makeInvitedEvent(calendar.id)), [
      calendar,
    ]);

    expect(queryRsvpGroup()).toBeInTheDocument();
    // The rest of the form stays read-only.
    expect(screen.getByRole("note")).toHaveTextContent(/read-only/i);
  });

  it("shows the control for the organizer when they are in the attendee list", () => {
    const calendar = makeCalendar();
    const event = makeInvitedEvent(calendar.id, {
      content: {
        kind: "details",
        title: "My own meeting",
        description: "",
        organizer: { email: ACCOUNT_EMAIL, displayName: null },
        attendees: [
          { ...selfAttendee, responseStatus: "accepted" },
          otherAttendee,
        ],
      },
    });

    renderEventForm(editDraftOrThrow(event), [calendar]);

    expect(queryRsvpGroup()).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Going" })).toBeChecked();
  });

  it("hides the control when the account email is not among the attendees", () => {
    const calendar = makeCalendar();
    const event = makeInvitedEvent(calendar.id, {
      content: {
        kind: "details",
        title: "Their meeting",
        description: "",
        organizer: { email: "organizer@example.com", displayName: null },
        attendees: [otherAttendee],
      },
    });

    renderEventForm(editDraftOrThrow(event), [calendar]);

    expect(queryRsvpGroup()).not.toBeInTheDocument();
  });

  it("hides the control on a local event", () => {
    const calendar = makeCalendar({
      provider: "local",
      accountEmail: undefined,
    });
    const event = createMockEvent({
      calendarId: calendar.id,
      content: { kind: "details", title: "Errand", description: "" },
    });

    renderEventForm(editDraftOrThrow(event), [calendar]);

    expect(queryRsvpGroup()).not.toBeInTheDocument();
  });

  it("hides the control for an event without attendees", () => {
    const calendar = makeCalendar();
    const event = createMockEvent({
      calendarId: calendar.id,
      content: { kind: "details", title: "Solo focus", description: "" },
    });

    renderEventForm(editDraftOrThrow(event), [calendar]);

    expect(queryRsvpGroup()).not.toBeInTheDocument();
  });
});
