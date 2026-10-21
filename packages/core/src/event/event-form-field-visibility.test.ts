import {
  type EventFormFieldVisibilityInput,
  isEventFormFocusFieldVisible,
} from "@core/event/event-form-field-visibility";
import { getCalendarCapabilities } from "@core/types/calendar.contracts";
import { describe, expect, it } from "bun:test";

const writableGoogle: EventFormFieldVisibilityInput = {
  mode: "edit",
  isReadOnly: false,
  isBusyContent: false,
  isScheduleLocked: false,
  calendarAccountEmail: "me@example.com",
  calendarCapabilities: {
    ...getCalendarCapabilities("owner"),
    conferenceKinds: ["meet"],
  },
  organizerEmail: "me@example.com",
  attendeeEmails: ["guest@example.com"],
  hasConferenceLink: false,
  creatableConferenceKind: null,
  recurrenceKind: "single",
};

describe("isEventFormFocusFieldVisible", () => {
  it("shows core writable fields on a normal edit draft", () => {
    for (const field of [
      "title",
      "location",
      "description",
      "start",
      "end",
      "color",
    ] as const) {
      expect(isEventFormFocusFieldVisible(field, writableGoogle)).toBe(true);
    }
  });

  it("hides recurrence on a single-instance edit", () => {
    expect(isEventFormFocusFieldVisible("recurrence", writableGoogle)).toBe(
      false,
    );
    expect(
      isEventFormFocusFieldVisible("recurrence", {
        ...writableGoogle,
        recurrenceKind: "series",
      }),
    ).toBe(true);
  });

  it("shows recurrence on create", () => {
    expect(
      isEventFormFocusFieldVisible("recurrence", {
        ...writableGoogle,
        mode: "create",
        recurrenceKind: "single",
      }),
    ).toBe(true);
  });

  it("hides RSVP when self is not in the attendee list", () => {
    expect(isEventFormFocusFieldVisible("rsvp", writableGoogle)).toBe(false);
    expect(
      isEventFormFocusFieldVisible("rsvp", {
        ...writableGoogle,
        attendeeEmails: ["me@example.com", "guest@example.com"],
      }),
    ).toBe(true);
  });

  it("hides RSVP when there are no attendees", () => {
    expect(
      isEventFormFocusFieldVisible("rsvp", {
        ...writableGoogle,
        attendeeEmails: [],
      }),
    ).toBe(false);
  });

  it("hides guests when the user does not organize the event", () => {
    expect(
      isEventFormFocusFieldVisible("attendees", {
        ...writableGoogle,
        organizerEmail: "host@example.com",
        attendeeEmails: ["me@example.com"],
      }),
    ).toBe(false);
  });

  it("shows guests when the user organizes and the calendar can invite", () => {
    expect(
      isEventFormFocusFieldVisible("attendees", {
        ...writableGoogle,
        attendeeEmails: ["guest@example.com"],
      }),
    ).toBe(true);
  });

  it("hides meeting link on edit when no link exists", () => {
    expect(isEventFormFocusFieldVisible("conference", writableGoogle)).toBe(
      false,
    );
    expect(
      isEventFormFocusFieldVisible("conference", {
        ...writableGoogle,
        hasConferenceLink: true,
      }),
    ).toBe(true);
  });

  it("shows add-meet on create when the calendar supports it", () => {
    expect(
      isEventFormFocusFieldVisible("conference", {
        ...writableGoogle,
        mode: "create",
        creatableConferenceKind: "meet",
      }),
    ).toBe(true);
    expect(
      isEventFormFocusFieldVisible("conference", {
        ...writableGoogle,
        mode: "create",
        creatableConferenceKind: null,
      }),
    ).toBe(false);
  });

  it("hides writable fields on read-only events but keeps RSVP and join link", () => {
    const readOnlyInvitee: EventFormFieldVisibilityInput = {
      ...writableGoogle,
      isReadOnly: true,
      attendeeEmails: ["me@example.com"],
      hasConferenceLink: true,
    };
    expect(isEventFormFocusFieldVisible("title", readOnlyInvitee)).toBe(false);
    expect(isEventFormFocusFieldVisible("rsvp", readOnlyInvitee)).toBe(true);
    expect(isEventFormFocusFieldVisible("conference", readOnlyInvitee)).toBe(
      true,
    );
  });

  it("hides schedule fields when provider-managed schedule is locked", () => {
    const locked: EventFormFieldVisibilityInput = {
      ...writableGoogle,
      isScheduleLocked: true,
      recurrenceKind: "series",
    };
    expect(isEventFormFocusFieldVisible("start", locked)).toBe(false);
    expect(isEventFormFocusFieldVisible("end", locked)).toBe(false);
    expect(isEventFormFocusFieldVisible("recurrence", locked)).toBe(false);
    expect(isEventFormFocusFieldVisible("title", locked)).toBe(true);
  });

  it("hides mutating fields on busy content", () => {
    const busy: EventFormFieldVisibilityInput = {
      ...writableGoogle,
      isBusyContent: true,
      isReadOnly: true,
    };
    expect(isEventFormFocusFieldVisible("title", busy)).toBe(false);
    expect(isEventFormFocusFieldVisible("rsvp", busy)).toBe(false);
    expect(isEventFormFocusFieldVisible("conference", busy)).toBe(false);
  });

  it("shows calendar picker only on create", () => {
    expect(isEventFormFocusFieldVisible("calendar", writableGoogle)).toBe(
      false,
    );
    expect(
      isEventFormFocusFieldVisible("calendar", {
        ...writableGoogle,
        mode: "create",
      }),
    ).toBe(true);
  });

  it("always exposes the actions toolbar target", () => {
    expect(isEventFormFocusFieldVisible("actions", writableGoogle)).toBe(true);
    expect(
      isEventFormFocusFieldVisible("actions", {
        ...writableGoogle,
        isReadOnly: true,
      }),
    ).toBe(true);
  });
});
