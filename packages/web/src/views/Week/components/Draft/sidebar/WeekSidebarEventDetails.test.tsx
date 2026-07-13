import { HotkeyManager } from "@tanstack/react-hotkeys";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen } from "@web/__tests__/__mocks__/mock.render";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { createGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { WeekSidebarEventDetails } from "@web/views/Week/components/Draft/sidebar/WeekSidebarEventDetails";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

const createDraft = (): GridEventDraft => {
  const draft = createGridEventDraft({
    kind: "timed",
    start: new Date("2026-05-26T14:00:00.000Z"),
    end: new Date("2026-05-26T15:00:00.000Z"),
    timeZone: "UTC",
  });
  if (draft.kind !== "create") throw new Error("Expected a create draft");

  return { ...draft, values: { ...draft.values, title: "Planning" } };
};

const renderPanel = ({
  draft = createDraft(),
  isFormOpen = true,
}: {
  draft?: GridEventDraft | null;
  isFormOpen?: boolean;
} = {}) => {
  const onSubmit = mock();
  const value = {
    actions: {
      discard: mock(),
      duplicateEvent: mock(),
    },
    confirmation: {
      onDelete: mock(),
      onSubmit,
    },
    setters: {
      setDraft: mock(),
    },
    state: {
      draft,
      isFormOpen,
    },
  } as never;

  const result = render(
    <DraftContext.Provider value={value}>
      <WeekSidebarEventDetails />
    </DraftContext.Provider>,
  );

  return { ...result, onSubmit };
};

beforeEach(() => {
  HotkeyManager.resetInstance();
});

afterEach(() => {
  cleanup();
});

describe("WeekSidebarEventDetails", () => {
  it("renders nothing while the form is closed", () => {
    renderPanel({ isFormOpen: false });

    expect(screen.queryByRole("form")).toBeNull();
  });

  it("submits the draft from title Enter", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPanel();

    const titleInput = screen.getByPlaceholderText("Title");
    titleInput.focus();

    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        values: expect.objectContaining({ title: "Planning" }),
      }),
    );
  });
});
