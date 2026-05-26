import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { ThemeProvider } from "styled-components";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import { theme } from "@web/common/styles/theme";
import { EVENT_FORM_TITLE_EDITING_STARTED_ATTRIBUTE } from "@web/common/utils/form/form.util";
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

  it("marks the title field as text editing after the user changes it", async () => {
    const user = userEvent.setup();
    const event = { ...createEvent(), title: "" };

    render(
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={mock()}
          setEvent={mock()}
        />
      </ThemeProvider>,
    );

    const titleField = screen.getByPlaceholderText("Title");

    expect(
      titleField.getAttribute(EVENT_FORM_TITLE_EDITING_STARTED_ATTRIBUTE),
    ).toBeNull();

    await user.type(titleField, "Plan");

    expect(
      titleField.getAttribute(EVENT_FORM_TITLE_EDITING_STARTED_ATTRIBUTE),
    ).toBe("true");
  });

  it("resets title editing state when an unsaved draft session changes", async () => {
    const user = userEvent.setup();
    const event = { ...createEvent(), _id: undefined, title: "" };

    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={mock()}
          setEvent={mock()}
          titleEditingResetKey={1}
        />
      </ThemeProvider>,
    );

    const titleField = screen.getByPlaceholderText("Title");
    await user.type(titleField, "Plan");

    expect(
      titleField.getAttribute(EVENT_FORM_TITLE_EDITING_STARTED_ATTRIBUTE),
    ).toBe("true");

    rerender(
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={mock()}
          setEvent={mock()}
          titleEditingResetKey={2}
        />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(
        titleField.getAttribute(EVENT_FORM_TITLE_EDITING_STARTED_ATTRIBUTE),
      ).toBeNull();
    });
  });

  it("commits a draft title without submitting the event when Enter is pressed", async () => {
    const user = userEvent.setup();
    const onSubmit = mock();
    const onTitleCommit = mock();

    render(
      <ThemeProvider theme={theme}>
        <EventForm
          event={createEvent()}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={onSubmit}
          onTitleCommit={onTitleCommit}
          setEvent={mock()}
        />
      </ThemeProvider>,
    );

    const titleField = screen.getByPlaceholderText("Title");
    titleField.focus();

    await user.keyboard("{Enter}");

    expect(onTitleCommit).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit a draft when Enter is pressed outside the title field", async () => {
    const user = userEvent.setup();
    const onSubmit = mock();

    render(
      <ThemeProvider theme={theme}>
        <button type="button">Draft block</button>
        <EventForm
          event={createEvent()}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={onSubmit}
          setEvent={mock()}
        />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Draft block" }));

    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exposes the title input ref to the parent", () => {
    const titleInputRef = createRef<HTMLInputElement>();

    render(
      <ThemeProvider theme={theme}>
        <EventForm
          event={createEvent()}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={mock()}
          setEvent={mock()}
          titleInputRef={titleInputRef}
        />
      </ThemeProvider>,
    );

    expect(titleInputRef.current).toBe(screen.getByPlaceholderText("Title"));
  });
});
