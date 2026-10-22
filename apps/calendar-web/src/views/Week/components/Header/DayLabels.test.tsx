import { act, cleanup, render, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { nowCueActions, useNowCueStore } from "@web/grid/now-cue/now-cue.store";
import { pageJumpHintActions } from "@web/shortcuts/page-jump/page-jump.store";
import { eventJumpActions } from "@web/shortcuts/shift-hint/event-jump.store";
import { getEffectiveTimeZone } from "@web/timezone/effective-timezone.store";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import { DayLabels } from "@web/views/Week/components/Header/DayLabels";
import { afterEach, describe, expect, it } from "bun:test";

const monday = dayjs("2026-08-17T12:00:00.000Z");
const weekDays = [
  monday,
  monday.add(1, "day"),
  monday.add(2, "day"),
  monday.add(3, "day"),
];

const renderLabels = () =>
  render(
    <DayLabels
      startOfView={monday.startOf("week")}
      today={monday}
      week={monday.week()}
      weekDays={weekDays}
    />,
  );

describe("DayLabels", () => {
  afterEach(() => {
    cleanup();
    eventJumpActions.reset();
    pageJumpHintActions.reset();
    nowCueActions.resetForTests();
  });

  it("shimmers today label text when the now cue is active", () => {
    nowCueActions.pulse();
    renderLabels();

    expect(useNowCueStore.getState().active).toBe(true);
    expect(screen.getByText("17")).toHaveClass("c-now-cue-label-shimmer");
    expect(screen.getByText("Mon")).toHaveClass("c-now-cue-label-shimmer");
    expect(
      screen.getByText("17").closest("[class*='c-now-cue-pulse']"),
    ).toBeNull();
  });

  it("reapplies the shimmer when the now cue fires again", () => {
    renderLabels();

    act(() => {
      nowCueActions.pulse();
    });
    expect(screen.getByText("Mon")).toHaveClass("c-now-cue-label-shimmer");

    act(() => {
      nowCueActions.pulse();
    });
    expect(useNowCueStore.getState().pulseGeneration).toBe(2);
    expect(screen.getByText("Mon")).toHaveClass("c-now-cue-label-shimmer");
    expect(screen.getByText("17")).toHaveClass("c-now-cue-label-shimmer");
  });

  it("shows the effective timezone in the grid corner", () => {
    renderLabels();

    const abbreviation = formatTimeZoneAbbreviation(getEffectiveTimeZone());
    expect(
      screen.getByRole("button", {
        name: `Calendar timezone: ${abbreviation}`,
      }),
    ).toHaveTextContent(abbreviation);
  });

  it("shows weekday abbreviations until jump hints are visible", () => {
    renderLabels();

    expect(screen.getByText("Mon")).toBeTruthy();
    expect(screen.getByText("Tue")).toBeTruthy();
    expect(screen.getByText("Wed")).toBeTruthy();
    expect(screen.getByText("Thu")).toBeTruthy();
    expect(screen.queryByText("m")).toBeNull();
    expect(screen.queryByText("r")).toBeNull();
  });

  it("swaps weekday abbreviations for day-jump prefixes while event jump is on", () => {
    eventJumpActions.setActive(true);
    renderLabels();

    expect(screen.getByText("m")).toBeTruthy();
    expect(screen.getByText("t")).toBeTruthy();
    expect(screen.getByText("w")).toBeTruthy();
    expect(screen.getByText("r")).toBeTruthy();
    expect(screen.queryByText("Mon")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Monday m");
    expect(screen.getByRole("status").textContent).toContain("Thursday r");
    expect(screen.getByRole("status").textContent).toContain(
      "Type the day key to focus that column.",
    );
  });

  it("shows day-jump prefixes while page-jump Mod-hold hints are visible", () => {
    pageJumpHintActions.setHintsVisible(true);
    renderLabels();

    // Jump mode is off here, so the column chip advertises the Shift entry.
    expect(screen.getByText("⇧m")).toBeTruthy();
    expect(screen.getByText("⇧r")).toBeTruthy();
    expect(screen.queryByText("Mon")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain(
      "Hold Shift and press the day key to focus that column.",
    );
  });
});
