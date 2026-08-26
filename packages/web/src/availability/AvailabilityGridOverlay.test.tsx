import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { type GridMeasurements } from "@web/grid/types/grid.types";
import { AvailabilityGridOverlay } from "./AvailabilityGridOverlay";
import {
  availabilityActions,
  useAvailabilityStore,
} from "./availability.store";
import { type AvailabilitySlot } from "./availability-slot.util";
import { beforeEach, describe, expect, it } from "bun:test";

const DAY = "2099-08-27";

/** Half-hour candidates on a date far enough ahead to never be "past". */
const slot = (hour: number, minute = 0, selected = false): AvailabilitySlot => {
  const pad = (value: number) => String(value).padStart(2, "0");
  const start = `${DAY}T${pad(hour)}:${pad(minute)}:00.000Z`;
  const end = new Date(Date.parse(start) + 30 * 60_000).toISOString();
  return { id: `${start}/${end}`, start, end, selected, origin: "suggested" };
};

const measurements: GridMeasurements = {
  allDayRow: null,
  colWidths: [100],
  hourHeight: 40,
  mainGrid: null,
};

const visibleDates = [{ date: dayjs(`${DAY}T12:00:00.000Z`), key: DAY }];

const renderOverlay = () =>
  render(
    <AvailabilityGridOverlay
      measurements={measurements}
      visibleDates={visibleDates}
    />,
  );

const options = () => screen.getAllByRole("option");

const openWith = (slots: AvailabilitySlot[]) => {
  availabilityActions.open(slots);
  availabilityActions.setStatus("ready");
};

describe("AvailabilityGridOverlay", () => {
  beforeEach(() => {
    availabilityActions.close();
  });

  it("renders only the picks and focuses the first one", async () => {
    openWith([slot(14, 0, true), slot(14, 30), slot(15, 0, true)]);
    renderOverlay();

    expect(options()).toHaveLength(2);
    await waitFor(() => expect(options()[0]).toHaveFocus());
  });

  it("repositions the active pick onto the next free block", () => {
    openWith([slot(14, 0, true), slot(14, 30), slot(15, 0)]);
    renderOverlay();

    fireEvent.keyDown(options()[0]!, { key: "ArrowDown" });

    expect(useAvailabilityStore.getState().pickIds).toEqual([slot(14, 30).id]);
  });

  it("steps over a block another pick already holds", () => {
    openWith([slot(14, 0, true), slot(14, 30, true), slot(15, 0)]);
    renderOverlay();

    fireEvent.keyDown(options()[0]!, { key: "ArrowDown" });

    // 14:30 is taken, so the first pick lands on 15:00 instead.
    expect(useAvailabilityStore.getState().pickIds).toEqual([
      slot(14, 30).id,
      slot(15, 0).id,
    ]);
  });

  it("accepts on Enter and advances focus to the next pick", async () => {
    openWith([slot(14, 0, true), slot(15, 0, true)]);
    renderOverlay();

    fireEvent.keyDown(options()[0]!, { key: "Enter" });

    const state = useAvailabilityStore.getState();
    expect(state.acceptedIds).toEqual([slot(14, 0).id]);
    expect(state.activePickIndex).toBe(1);
    await waitFor(() => expect(options()[1]).toHaveFocus());
  });

  it("moves focus to the copy button once the last pick is accepted", async () => {
    openWith([slot(14, 0, true)]);
    render(
      <>
        <AvailabilityGridOverlay
          measurements={measurements}
          visibleDates={visibleDates}
        />
        <button aria-label="Copy availability to clipboard" type="button">
          Copy
        </button>
      </>,
    );

    fireEvent.keyDown(options()[0]!, { key: "Enter" });

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Copy availability to clipboard",
        }),
      ).toHaveFocus(),
    );
  });

  it("adds and removes picks, but keeps the last one", () => {
    openWith([slot(14, 0, true), slot(14, 30), slot(15, 0)]);
    renderOverlay();

    fireEvent.keyDown(options()[0]!, { key: "a" });
    expect(useAvailabilityStore.getState().pickIds).toHaveLength(2);

    fireEvent.keyDown(options()[0]!, { key: "Backspace" });
    expect(useAvailabilityStore.getState().pickIds).toHaveLength(1);

    fireEvent.keyDown(options()[0]!, { key: "Backspace" });
    expect(useAvailabilityStore.getState().pickIds).toHaveLength(1);
    expect(useAvailabilityStore.getState().announcement).toBe(
      "Keep at least one time to share.",
    );
  });

  it("renders nothing once the panel is closed", () => {
    openWith([slot(14, 0, true)]);
    const view = renderOverlay();
    act(() => availabilityActions.close());
    view.rerender(
      <AvailabilityGridOverlay
        measurements={measurements}
        visibleDates={visibleDates}
      />,
    );

    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
