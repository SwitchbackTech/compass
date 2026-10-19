import "@testing-library/jest-dom";
import { HotkeyManager } from "@tanstack/react-hotkeys";
import { render, screen } from "@testing-library/react";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import {
  createGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const FORM_CARD_SURFACE_CLASS = "bg-surface-overlay";

function nearestFormCard(element: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = element;
  while (node) {
    if (node.classList.contains(FORM_CARD_SURFACE_CLASS)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

const makeCalendar = (): Calendar => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Work calendar",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "google",
  access: "owner",
  capabilities: {
    ...getCalendarCapabilities("owner"),
    conferenceKinds: ["meet"],
  },
  isPrimary: true,
  isVisible: true,
  isActive: true,
  accountEmail: "me@example.com",
});

describe("EventForm meeting logistics section", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
  });

  it("groups location, Add Google Meet, and Add guests in one FormCard", () => {
    const calendar = makeCalendar();
    const draft = createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T10:00:00.000Z"),
        new Date("2026-05-20T11:00:00.000Z"),
      ),
      undefined,
      calendar.id,
    );
    const { queryClient, wrapper } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [calendar]);

    render(
      <EventForm
        draft={draft}
        isDraft
        isExistingEvent={false}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
      />,
      { wrapper },
    );

    const locationField = screen.getByRole("textbox", { name: "Location" });
    const meetLabel = screen.getByText("Add Google Meet");
    const guestsField = screen.getByRole("combobox", { name: "Guests" });
    const descriptionRegion = screen.getByRole("textbox", {
      name: "Description",
    });

    const logisticsCard = nearestFormCard(locationField);
    expect(logisticsCard).not.toBeNull();
    expect(nearestFormCard(meetLabel)).toBe(logisticsCard);
    expect(nearestFormCard(guestsField)).toBe(logisticsCard);
    expect(nearestFormCard(descriptionRegion)).not.toBe(logisticsCard);
  });
});
