import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import { theme } from "@web/common/styles/theme";
import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module(
  "@web/views/Forms/EventForm/DateControlsSection/DateControlsSection/DateControlsSection",
  () => ({
    DateControlsSection: () => null,
  }),
);

mock.module(
  "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/RecurrenceSection",
  () => ({
    RecurrenceSection: () => null,
  }),
);

mock.module("@web/views/Forms/EventForm/EventActionMenu", () => ({
  EventActionMenu: () => null,
}));

mock.module("@web/views/Forms/EventForm/PrioritySection", () => ({
  PrioritySection: () => null,
}));

mock.module("@web/views/Forms/EventForm/SaveSection", () => ({
  SaveSection: () => null,
}));

const { EventForm } = require("./EventForm") as typeof import("./EventForm");

function dispatchModD(target: HTMLElement) {
  const modifierKey = resolveModifier("Mod");
  const isControl = modifierKey === "Control";

  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      composed: true,
      ctrlKey: isControl,
      key: "d",
      metaKey: !isControl,
    }),
  );
}

const createEvent = (): Schema_Event => ({
  _id: "event-1",
  description: "",
  endDate: "2026-04-24T15:00:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  startDate: "2026-04-24T14:00:00.000Z",
  title: "Keyboard duplicate event",
  user: "user-1",
});

describe("EventForm", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
  });

  it("duplicates the event with Mod+D while the title field is focused", async () => {
    const event = createEvent();
    const onDuplicate = mock();

    render(
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={false}
          isExistingEvent={true}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={onDuplicate}
          onSubmit={mock()}
          setEvent={mock()}
        />
      </ThemeProvider>,
    );

    const titleField = screen.getByPlaceholderText("Title");
    titleField.focus();

    dispatchModD(titleField);

    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledTimes(1);
    });
    expect(onDuplicate).toHaveBeenCalledWith(event);
  });
});
