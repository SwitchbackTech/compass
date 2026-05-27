import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type PropsWithChildren, type Ref } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { afterEach, describe, expect, it, mock } from "bun:test";

let floatingFocusManagerProps: { modal?: boolean } | null = null;

mock.module("@floating-ui/react", () => ({
  FloatingFocusManager: ({
    children,
    ...props
  }: PropsWithChildren<{ modal?: boolean }>) => {
    floatingFocusManagerProps = props;
    return <>{children}</>;
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

const renderGridDraft = (draft = createDraft()) => {
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
  floatingFocusManagerProps = null;
});

describe("GridDraft keyboard focus", () => {
  it("renders all-day drafts that do not carry timed-event position data", () => {
    renderGridDraft(
      createDraft({
        endDate: "2026-05-27T00:00:00.000Z",
        isAllDay: true,
        position: undefined,
        startDate: "2026-05-26T00:00:00.000Z",
      }),
    );

    expect(
      screen.getByRole("button", { name: /All-day event: Planning/ }),
    ).toBeInTheDocument();
  });

  it("keeps the floating form non-modal while the draft block is a focus target", () => {
    renderGridDraft();

    expect(floatingFocusManagerProps?.modal).toBe(false);
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
