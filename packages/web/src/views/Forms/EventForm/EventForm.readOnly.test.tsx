import { HotkeyManager } from "@tanstack/react-hotkeys";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { editGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// packet 08 step 8: read-only web mode + busy-content rendering. Sibling to
// EventForm.test.tsx/EventForm.calendarSelect.test.tsx (not an extension of
// either) for the same reason EventForm.calendarSelect.test.tsx is its own
// file - isolates this concern from EventForm.test.tsx's heavy subcomponent
// mocking and pre-existing lint warnings.

const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Shared calendar",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "google",
  access: "reader",
  capabilities: getCalendarCapabilities("reader"),
  isPrimary: false,
  isVisible: true,
  isActive: true,
  ...overrides,
});

const renderEventForm = (
  draft: GridEventDraft,
  calendars: Calendar[],
  overrides: { onSubmit?: (draft: GridEventDraft | null) => void } = {},
) => {
  const { queryClient, wrapper } = createStoreWrapper();
  queryClient.setQueryData(calendarQueryKeys.all, calendars);

  const onSubmit = overrides.onSubmit ?? mock();

  const utils = render(
    <EventForm
      draft={draft}
      isDraft={draft.kind === "create"}
      isExistingEvent={draft.kind === "edit"}
      onClose={mock()}
      onDelete={mock()}
      onDuplicate={mock()}
      onSubmit={onSubmit}
      setDraft={mock()}
    />,
    { wrapper },
  );

  return { onSubmit, ...utils };
};

describe("EventForm read-only gate", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
  });

  it("disables every field, hides Save, and shows a read-only note for a read-only-calendar edit draft", () => {
    const readOnlyCalendar = makeCalendar();
    const event = createMockEvent({
      calendarId: readOnlyCalendar.id,
      content: {
        kind: "details",
        title: "Team offsite",
        description: "Bring a laptop",
      },
    });
    const draft = editGridEventDraft(event);
    if (!draft) throw new Error("expected an edit draft");

    const { container } = renderEventForm(draft, [readOnlyCalendar]);

    expect(screen.getByPlaceholderText("Title")).toBeDisabled();
    expect(screen.getByPlaceholderText("Description")).toBeDisabled();
    // The priority/date/recurrence/description block is wrapped in a native
    // <fieldset disabled>, which auto-disables every native control it
    // contains (see EventForm.tsx) - checked on the fieldset itself rather
    // than a specific child so this doesn't couple to PrioritySection's
    // internals.
    const fieldsets = container.querySelectorAll("fieldset");
    expect(fieldsets.length).toBeGreaterThan(0);
    for (const fieldset of fieldsets) {
      expect(fieldset).toBeDisabled();
    }
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/read-only/i);
    // The real title/description still show through - a read-only reader
    // calendar can have canReadDetails: true, so there's real content to
    // display, just nothing the user can save.
    expect(screen.getByPlaceholderText("Title")).toHaveValue("Team offsite");
  });

  it("does not call onSubmit when Enter is pressed on a read-only edit draft", async () => {
    const user = userEvent.setup();
    const readOnlyCalendar = makeCalendar();
    const event = createMockEvent({ calendarId: readOnlyCalendar.id });
    const draft = editGridEventDraft(event);
    if (!draft) throw new Error("expected an edit draft");
    const onSubmit = mock();

    renderEventForm(draft, [readOnlyCalendar], { onSubmit });

    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders 'Busy' as the title and is read-only even on a writable calendar", () => {
    const writableCalendar = makeCalendar({
      access: "owner",
      capabilities: getCalendarCapabilities("owner"),
    });
    const event = createMockEvent({
      calendarId: writableCalendar.id,
      content: { kind: "busy" },
    });
    const draft = editGridEventDraft(event);
    if (!draft) throw new Error("expected an edit draft");

    renderEventForm(draft, [writableCalendar]);

    expect(screen.getByPlaceholderText("Title")).toHaveValue("Busy");
    expect(screen.getByPlaceholderText("Description")).toHaveValue("");
    expect(screen.getByPlaceholderText("Title")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/read-only/i);
  });

  it("keeps every field enabled, allows Enter to submit, for a writable-calendar edit draft", async () => {
    const user = userEvent.setup();
    const writableCalendar = makeCalendar({
      access: "owner",
      capabilities: getCalendarCapabilities("owner"),
    });
    const event = createMockEvent({
      calendarId: writableCalendar.id,
      content: { kind: "details", title: "My event", description: "" },
    });
    const draft = editGridEventDraft(event);
    if (!draft) throw new Error("expected an edit draft");
    const onSubmit = mock();

    const { container } = renderEventForm(draft, [writableCalendar], {
      onSubmit,
    });

    expect(screen.getByPlaceholderText("Title")).not.toBeDisabled();
    expect(screen.getByPlaceholderText("Description")).not.toBeDisabled();
    for (const fieldset of container.querySelectorAll("fieldset")) {
      expect(fieldset).not.toBeDisabled();
    }
    expect(screen.queryByRole("note")).not.toBeInTheDocument();

    // Behavioral regression check (not just "Save is disabled/hidden"):
    // the full submit path - blocked above for a read-only draft - must
    // still work end to end for a writable one.
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
