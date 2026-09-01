import dayjs from "@core/util/date/dayjs";
import {
  DATA_TIMED_GRID_ROW,
  ID_ALLDAY_COLUMNS,
  ID_GRID_ALLDAY_ROW,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import {
  POINTER_ACTION_ATTRIBUTE,
  POINTER_ACTIONS,
  POINTER_EVENT_ID_ATTRIBUTE,
  POINTER_SHORTCUT_ATTRIBUTE,
  pointerGridIntentFromPointer,
  resolveBlockedPointerAttempt,
  teachingFromBlockedPointer,
} from "@web/shortcuts/keyboard-only/pointer-action";
import { getEffectiveTimeZone } from "@web/timezone/effective-timezone.store";
import { afterEach, describe, expect, it } from "bun:test";

describe("resolveBlockedPointerAttempt", () => {
  it("uses the nearest annotated element in the composed path", () => {
    const outer = document.createElement("button");
    outer.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.sidebarClose);
    const inner = document.createElement("span");
    inner.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.eventOpen);
    inner.setAttribute(POINTER_EVENT_ID_ATTRIBUTE, "event-1");

    expect(resolveBlockedPointerAttempt([inner, outer, document])).toEqual({
      actionId: POINTER_ACTIONS.eventOpen,
      eventId: "event-1",
    });
  });

  it("falls back safely for unannotated targets", () => {
    expect(
      resolveBlockedPointerAttempt([document.createElement("div"), document]),
    ).toEqual({ actionId: "unknown" });
  });

  it("attaches the nearest shortcut key from the composed path", () => {
    const outer = document.createElement("div");
    outer.setAttribute(POINTER_SHORTCUT_ATTRIBUTE, "U");
    const inner = document.createElement("button");
    inner.setAttribute(POINTER_SHORTCUT_ATTRIBUTE, "1");

    expect(resolveBlockedPointerAttempt([inner, outer, document])).toEqual({
      actionId: "unknown",
      shortcutKey: "1",
    });
  });

  it("keeps an action and a shortcut from different ancestors", () => {
    const outer = document.createElement("div");
    outer.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.sidebarOpen);
    const inner = document.createElement("span");
    inner.setAttribute(POINTER_SHORTCUT_ATTRIBUTE, "S");

    expect(resolveBlockedPointerAttempt([inner, outer, document])).toEqual({
      actionId: POINTER_ACTIONS.sidebarOpen,
      shortcutKey: "S",
    });
  });
});

describe("teachingFromBlockedPointer", () => {
  const eventTarget = () => {
    const target = document.createElement("div");
    target.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.eventOpen);
    target.setAttribute(POINTER_EVENT_ID_ATTRIBUTE, "event-1");
    return target;
  };

  it("activates event jump for a primary click on an event", () => {
    const target = eventTarget();
    expect(teachingFromBlockedPointer([target, document], 0)).toEqual({
      attempt: { actionId: POINTER_ACTIONS.eventOpen, eventId: "event-1" },
      jumpEventId: "event-1",
    });
  });

  it("does not start event jump for a right-click on an event", () => {
    const target = eventTarget();
    expect(teachingFromBlockedPointer([target, document], 2)).toEqual({
      attempt: { actionId: "unknown" },
    });
  });

  it("still teaches sidebar actions on a non-primary click", () => {
    const target = document.createElement("button");
    target.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.sidebarClose);
    expect(teachingFromBlockedPointer([target, document], 2)).toEqual({
      attempt: { actionId: POINTER_ACTIONS.sidebarClose },
    });
  });

  it("teaches go-to-today from the annotated month picker control", () => {
    const target = document.createElement("button");
    target.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.goToToday);
    expect(teachingFromBlockedPointer([target, document], 0)).toEqual({
      attempt: { actionId: POINTER_ACTIONS.goToToday },
    });
  });

  it("teaches start-trial and reconnect from annotated banner CTAs", () => {
    const trial = document.createElement("button");
    trial.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.startTrial);
    trial.setAttribute(POINTER_SHORTCUT_ATTRIBUTE, "S");
    expect(teachingFromBlockedPointer([trial, document], 0)).toEqual({
      attempt: {
        actionId: POINTER_ACTIONS.startTrial,
        shortcutKey: "S",
      },
    });

    const reconnect = document.createElement("button");
    reconnect.setAttribute(
      POINTER_ACTION_ATTRIBUTE,
      POINTER_ACTIONS.reconnectGoogle,
    );
    reconnect.setAttribute(POINTER_SHORTCUT_ATTRIBUTE, "G");
    expect(teachingFromBlockedPointer([reconnect, document], 0)).toEqual({
      attempt: {
        actionId: POINTER_ACTIONS.reconnectGoogle,
        shortcutKey: "G",
      },
    });
  });
});

describe("pointerGridIntentFromPointer", () => {
  const mounted: HTMLElement[] = [];

  const mount = (node: HTMLElement) => {
    document.body.append(node);
    mounted.push(node);
    return node;
  };

  afterEach(() => {
    for (const node of mounted) node.remove();
    mounted.length = 0;
  });

  const mountTimedGrid = () => {
    const grid = mount(document.createElement("div"));
    grid.id = ID_GRID_MAIN;
    Object.defineProperty(grid, "scrollHeight", { value: 1440 });
    grid.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 250, bottom: 400 }) as DOMRect;

    const columns = document.createElement("div");
    columns.id = ID_GRID_COLUMNS_TIMED;
    const column = document.createElement("div");
    column.dataset.gridDate = "2026-08-29";
    column.getBoundingClientRect = () =>
      ({ top: 0, left: 50, right: 250, bottom: 1440 }) as DOMRect;
    columns.appendChild(column);

    const hourRows = document.createElement("div");
    const hourRow = document.createElement("div");
    hourRow.setAttribute(DATA_TIMED_GRID_ROW, "true");
    hourRows.appendChild(hourRow);

    grid.append(columns, hourRows);
    return { column, columns, grid, hourRow, hourRows };
  };

  it("keeps the exact effective-zone quarter-hour selected by a timed click", () => {
    const { column, columns } = mountTimedGrid();

    const intent = pointerGridIntentFromPointer(
      [column, columns, document],
      100,
      690,
    );

    expect(intent).toMatchObject({
      date: "2026-08-29",
      kind: "timed",
      timeKey: "1130",
    });
    expect(
      dayjs(intent?.start).tz(getEffectiveTimeZone()).format("HH:mm"),
    ).toBe("11:30");
  });

  it("reads the clicked quarter-hour from an empty hour-row overlay", () => {
    const { grid, hourRow, hourRows } = mountTimedGrid();

    const intent = pointerGridIntentFromPointer(
      [hourRow, hourRows, grid, document],
      100,
      690,
    );

    expect(intent).toMatchObject({
      date: "2026-08-29",
      kind: "timed",
      timeKey: "1130",
    });
  });

  it("maps an evening empty-grid click to 24-hour digits", () => {
    const { grid, hourRow, hourRows } = mountTimedGrid();

    const intent = pointerGridIntentFromPointer(
      [hourRow, hourRows, grid, document],
      100,
      1110,
    );

    expect(intent).toMatchObject({
      date: "2026-08-29",
      kind: "timed",
      timeKey: "1830",
    });
  });

  it("still teaches a time when the click is in the hour-label gutter", () => {
    const { grid } = mountTimedGrid();

    const intent = pointerGridIntentFromPointer([grid, document], 20, 690);

    expect(intent).toMatchObject({
      date: "2026-08-29",
      kind: "timed",
      timeKey: "1130",
    });
  });

  it("treats an empty all-day-row click as an all-day create", () => {
    const row = mount(document.createElement("section"));
    row.id = ID_GRID_ALLDAY_ROW;
    const columns = document.createElement("div");
    columns.id = ID_ALLDAY_COLUMNS;
    const column = document.createElement("div");
    column.dataset.gridDate = "2026-08-29";
    column.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 200, bottom: 40 }) as DOMRect;
    columns.appendChild(column);
    row.appendChild(columns);

    expect(pointerGridIntentFromPointer([row, document], 100, 10)).toEqual({
      date: "2026-08-29",
      kind: "all-day",
    });
  });
});
