import { render, screen } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { createGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { CALENDAR_DECK_MIN_WIDTH } from "@web/layout/calendar-grid/calendarGrid.constants";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { GridDraft } from "./GridDraft";
import { afterEach, describe, expect, it, mock } from "bun:test";

// The interactive draft GridDraft.tsx reads from context — always a
// not-yet-saved "create" GridEventDraft in these fixtures (none of these
// tests exercise editing an existing event).
const createDraft = (
  overrides: {
    endDate?: string;
    isAllDay?: boolean;
    startDate?: string;
    title?: string;
  } = {},
): GridEventDraft => {
  const {
    endDate = "2026-05-26T15:00:00.000Z",
    isAllDay = false,
    startDate = "2026-05-26T14:00:00.000Z",
    title = "Planning",
  } = overrides;

  const draft = createGridEventDraft(
    isAllDay
      ? { kind: "allDay", start: new Date(startDate), end: new Date(endDate) }
      : {
          kind: "timed",
          start: new Date(startDate),
          end: new Date(endDate),
          timeZone: "UTC",
        },
  );
  if (draft.kind !== "create") throw new Error("Expected a create draft");

  return { ...draft, values: { ...draft.values, title } };
};

// activeAllDayDraftEvent/recurringPreviews are still Schema_GridEvent-shaped
// props (out of this phase's scope — the wider grid *renderer* conversion),
// so they need their own Schema_GridEvent-shaped fixture, independent of the
// interactive GridEventDraft above.
const createSchemaGridEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  description: "",
  endDate: "2026-05-26T15:00:00.000Z",
  isAllDay: false,
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
      weekDays: [...Array(7)].map((_, index) =>
        dayjs("2026-05-24T00:00:00.000").add(index, "day"),
      ),
    },
  }) as WeekProps;

const renderGridDraft = ({
  activeAllDayDraftEvent = null,
  deckLayout = null,
  draft = createDraft(),
  recurringPreviews = [],
}: {
  activeAllDayDraftEvent?: Schema_GridEvent | null;
  deckLayout?: { groupSize: number; order: number } | null;
  draft?: GridEventDraft;
  recurringPreviews?: Schema_GridEvent[];
} = {}) => {
  const value = {
    actions: {
      convert: mock(),
      discard: mock(),
      duplicateEvent: mock(),
      repositionDraftByKeyboard: mock(() => true),
      startDragging: mock(),
    },
    confirmation: {
      onDelete: mock(),
      onSubmit: mock(),
    },
    setters: {
      setDateBeingChanged: mock(),
      setDraft: mock(),
      setDragOffset: mock(),
      setIsResizing: mock(),
    },
    state: {
      draft,
      dragOffset: { x: 0, y: 0 },
      isDragging: false,
      isFormOpen: true,
      isResizing: false,
    },
  } as never;

  return render(
    <DraftContext.Provider value={value}>
      <GridDraft
        activeAllDayDraftEvent={activeAllDayDraftEvent}
        deckLayout={deckLayout}
        measurements={{
          allDayRow: null,
          colWidths: [100, 100, 100, 100, 100, 100, 100],
          hourHeight: 48,
          mainGrid: null,
        }}
        recurringPreviews={recurringPreviews}
        weekProps={createWeekProps()}
      />
    </DraftContext.Provider>,
  );
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("GridDraft", () => {
  it("positions all-day drafts in the all-day row", () => {
    renderGridDraft({
      draft: createDraft({
        endDate: "2026-05-27T00:00:00.000Z",
        isAllDay: true,
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

  it("uses the positioned all-day draft row when one is provided", () => {
    const draft = createDraft({
      endDate: "2026-05-27T00:00:00.000Z",
      isAllDay: true,
      startDate: "2026-05-26T00:00:00.000Z",
    });

    renderGridDraft({
      activeAllDayDraftEvent: {
        ...createSchemaGridEvent({
          endDate: "2026-05-27T00:00:00.000Z",
          isAllDay: true,
          startDate: "2026-05-26T00:00:00.000Z",
        }),
        row: 3,
      },
      draft,
    });

    expect(
      screen.getByRole("button", { name: /All-day event: Planning/ }),
    ).toHaveStyle({
      top: "69px",
    });
  });

  it("keeps an active overlapping saved draft at its stacked width and stack order", () => {
    const deckLayout = { groupSize: 2, order: 0 };

    renderGridDraft({
      deckLayout,
    });

    const draftBlock = screen.getByRole("button", {
      name: /Timed event: Planning/,
    });

    expect(draftBlock.style.width).toBe(`${CALENDAR_DECK_MIN_WIDTH}px`);
    expect(Number(draftBlock.style.zIndex)).toBe(deckLayout.order + 1);
  });

  it("renders a read-only card for each recurring preview occurrence", () => {
    renderGridDraft({
      recurringPreviews: [
        createSchemaGridEvent({
          _id: undefined,
          endDate: "2026-05-27T15:00:00.000Z",
          startDate: "2026-05-27T14:00:00.000Z",
        }),
        createSchemaGridEvent({
          _id: undefined,
          endDate: "2026-05-28T15:00:00.000Z",
          startDate: "2026-05-28T14:00:00.000Z",
        }),
      ],
    });

    // The interactive draft plus one card per preview occurrence.
    expect(
      screen.getAllByRole("button", { name: /Timed event: Planning/ }),
    ).toHaveLength(3);
  });
});
