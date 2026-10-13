import { HotkeyManager } from "@tanstack/react-hotkeys";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { focusEventFormField } from "@web/common/utils/form/form.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { editGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Shared calendar",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "google",
  access: "owner",
  capabilities: getCalendarCapabilities("owner"),
  isPrimary: false,
  isVisible: true,
  isActive: true,
  ...overrides,
});

const renderEventForm = (draft: GridEventDraft, calendars: Calendar[]) => {
  const { queryClient, wrapper } = createStoreWrapper();
  queryClient.setQueryData(calendarQueryKeys.all, calendars);

  return render(
    <EventForm
      draft={draft}
      isDraft={draft.kind === "create"}
      isExistingEvent={draft.kind === "edit"}
      onClose={mock()}
      onDelete={mock()}
      onDuplicate={mock()}
      onSubmit={mock()}
      setDraft={mock()}
    />,
    { wrapper },
  );
};

const lastToastMessage = (toastMock: { mock: { calls: unknown[][] } }) => {
  const call = toastMock.mock.calls.at(-1);
  return call ? String(call[0]) : "";
};

describe("EventForm provider-managed staging UX", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
  });

  it("toasts with the Google Calendar product name when schedule is clicked", async () => {
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);

    const writableCalendar = makeCalendar({ provider: "google" });
    const event = createMockEvent({
      calendarId: writableCalendar.id,
      providerManaged: true,
      content: {
        kind: "details",
        title: "Flight reminder",
        description: "",
      },
    });
    const draft = editGridEventDraft(event);
    if (!draft) throw new Error("expected an edit draft");

    renderEventForm(draft, [writableCalendar]);

    const scheduleGroup = screen.getByRole("group", { name: "Event schedule" });
    const shield = scheduleGroup.parentElement?.querySelector(
      ".cursor-not-allowed",
    );
    if (!(shield instanceof HTMLElement)) {
      throw new Error("expected schedule shield overlay");
    }
    fireEvent.pointerDown(shield);

    expect(mocks.toast).toHaveBeenCalled();
    expect(lastToastMessage(mocks.toast)).toBe(
      "This time is managed by Google Calendar.",
    );
  });

  it("blocks digit jumps to schedule with the Outlook product name", () => {
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);

    const writableCalendar = makeCalendar({ provider: "microsoft" });
    const event = createMockEvent({
      calendarId: writableCalendar.id,
      providerManaged: true,
      content: {
        kind: "details",
        title: "Hotel hold",
        description: "",
      },
    });
    const draft = editGridEventDraft(event);
    if (!draft) throw new Error("expected an edit draft");

    renderEventForm(draft, [writableCalendar]);

    expect(focusEventFormField("start")).toBe(false);
    expect(lastToastMessage(mocks.toast)).toBe(
      "This time is managed by Outlook.",
    );
  });
});
