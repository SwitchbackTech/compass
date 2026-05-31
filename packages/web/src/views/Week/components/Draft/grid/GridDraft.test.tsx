import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type PropsWithChildren, type Ref, useState } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { CALENDAR_DECK_MIN_WIDTH } from "@web/common/calendar-grid/calendarGrid.constants";
import { ZIndex } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { afterEach, describe, expect, it, mock } from "bun:test";

mock.module("@floating-ui/react", () => ({
  FloatingFocusManager: ({
    children,
    closeOnFocusOut,
    modal,
  }: PropsWithChildren<{ closeOnFocusOut?: boolean; modal?: boolean }>) => {
    const [isMounted, setIsMounted] = useState(true);

    return (
      <div
        data-modal={String(modal)}
        data-testid="grid-draft-focus-manager"
        onFocusCapture={(event) => {
          if (closeOnFocusOut === false) return;
          if (event.target !== event.currentTarget) {
            setIsMounted(false);
          }
        }}
      >
        {isMounted ? children : null}
      </div>
    );
  },
}));

mock.module("@web/views/Forms/EventForm/EventForm", () => ({
  EventForm: ({
    event: draftEvent,
    onDraftTitleArrowKey,
    onSubmit,
    titleInputRef,
  }: {
    event: Schema_GridEvent;
    onDraftTitleArrowKey?: (key: string) => boolean;
    onSubmit?: (event: Schema_GridEvent) => void;
    titleInputRef?: Ref<HTMLInputElement>;
  }) => (
    <>
      <input
        aria-label="Draft title"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit?.(draftEvent);
          }

          if (event.key === "ArrowDown") {
            onDraftTitleArrowKey?.(event.key);
          }
        }}
        ref={titleInputRef}
      />
      <button type="button" aria-label="Nested action menu item">
        Nested action
      </button>
    </>
  ),
}));

const { GridDraft } = require("./GridDraft") as typeof import("./GridDraft");

const createDraft = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  description: "",
  endDate: "2026-05-26T15:00:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  position: gridEventDefaultPosition,
  priority: Priorities.UNASSIGNED,
  startDate: "2026-05-26T14:00:00.000Z",
  title: "Planning",
  user: "user-1",
  ...overrides,
});

const createWeekProps = (): WeekProps =>
  ({
    component: {
      endOfView: dayjs("2026-05-30T23:59:59.999"),
      startOfView: dayjs("2026-05-24T00:00:00.000"),
    },
  }) as WeekProps;

const createFormProps = () => {
  const reference = { current: null as HTMLElement | null };

  return {
    context: {},
    getFloatingProps: () => ({}),
    getReferenceProps: () => ({}),
    refs: {
      reference,
      setFloating: mock(),
      setReference: (node: HTMLElement | null) => {
        reference.current = node;
      },
    },
    strategy: "fixed",
    x: 0,
    y: 0,
  };
};

const renderGridDraft = ({
  deckLayout = null,
  draft = createDraft(),
}: {
  deckLayout?: { groupSize: number; order: number } | null;
  draft?: Schema_GridEvent;
} = {}) => {
  const repositionDraftByKeyboard = mock(() => true);
  const onSubmit = mock();
  const value = {
    actions: {
      convert: mock(),
      discard: mock(),
      duplicateEvent: mock(),
      repositionDraftByKeyboard,
      startDragging: mock(),
    },
    confirmation: {
      onDelete: mock(),
      onSubmit,
    },
    setters: {
      setDateBeingChanged: mock(),
      setDraft: mock(),
      setIsResizing: mock(),
    },
    state: {
      draft,
      formProps: createFormProps(),
      isDragging: false,
      isFormOpen: true,
      isResizing: false,
    },
  } as never;

  const result = render(
    <DraftContext.Provider value={value}>
      <GridDraft
        deckLayout={deckLayout}
        measurements={{
          allDayRow: null,
          colWidths: [100, 100, 100, 100, 100, 100, 100],
          hourHeight: 48,
          mainGrid: null,
        }}
        weekProps={createWeekProps()}
      />
    </DraftContext.Provider>,
  );

  return { ...result, onSubmit, repositionDraftByKeyboard };
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("GridDraft keyboard focus", () => {
  it("positions all-day drafts in the all-day row", () => {
    renderGridDraft({
      draft: createDraft({
        endDate: "2026-05-27T00:00:00.000Z",
        isAllDay: true,
        position: undefined,
        startDate: "2026-05-26T00:00:00.000Z",
      }),
    });

    expect(
      screen.getByRole("button", { name: /All-day event: Planning/ }),
    ).toHaveStyle({
      height: "20px",
      left: "200px",
      top: "23px",
      width: "90px",
    });
  });

  it("keeps the floating form mounted when focus moves into nested menus", async () => {
    renderGridDraft();

    expect(screen.getByTestId("grid-draft-focus-manager")).toHaveAttribute(
      "data-modal",
      "false",
    );

    fireEvent.focus(
      screen.getByRole("button", { name: "Nested action menu item" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: "Draft title" }),
      ).toBeVisible();
    });
  });

  it("keeps an active overlapping saved draft at its stacked width while raising it", () => {
    renderGridDraft({
      deckLayout: { groupSize: 2, order: 0 },
    });

    const draftBlock = screen.getByRole("button", {
      name: /Timed event: Planning/,
    });

    expect(draftBlock.style.width).toBe(`${CALENDAR_DECK_MIN_WIDTH}px`);
    expect(Number(draftBlock.style.zIndex)).toBe(ZIndex.MAX);
  });

  it("submits the draft from title Enter without focusing the draft block", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderGridDraft();

    const titleInput = screen.getByRole("textbox", { name: "Draft title" });
    titleInput.focus();

    await user.keyboard("{Enter}");

    const draftBlock = screen.getByRole("button", {
      name: /Timed event: Planning/,
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ title: "Planning" }),
    );
    expect(document.activeElement).not.toBe(draftBlock);
  });

  it("routes draft title arrow movement through the draft action", async () => {
    const user = userEvent.setup();
    const { repositionDraftByKeyboard } = renderGridDraft();

    screen.getByRole("textbox", { name: "Draft title" }).focus();
    await user.keyboard("{ArrowDown}");

    expect(repositionDraftByKeyboard).toHaveBeenCalledWith("ArrowDown");
  });
});
