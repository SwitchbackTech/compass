import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  TIMEZONE_MISMATCH_KEEP_SHORTCUT_KEY,
  TIMEZONE_MISMATCH_SWITCH_SHORTCUT_KEY,
} from "@web/shortcuts/notice-focus/useNoticeActionShortcut";
import { TimezoneMismatchBanner } from "@web/timezone/TimezoneMismatchBanner";
import { describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";

describe("TimezoneMismatchBanner", () => {
  it("shows shortcut keycaps on both actions", () => {
    render(
      <TimezoneMismatchBanner
        browserZone="America/Denver"
        calendarZone="America/New_York"
        onKeep={() => {}}
        onSwitch={() => {}}
      />,
    );

    expect(
      screen.getByText(TIMEZONE_MISMATCH_SWITCH_SHORTCUT_KEY),
    ).toBeVisible();
    expect(screen.getByText(TIMEZONE_MISMATCH_KEEP_SHORTCUT_KEY)).toBeVisible();
  });

  it("fires switch from the H shortcut", async () => {
    const user = userEvent.setup();
    let switched = false;
    render(
      <TimezoneMismatchBanner
        browserZone="America/Denver"
        calendarZone="America/New_York"
        onKeep={() => {}}
        onSwitch={() => {
          switched = true;
        }}
      />,
    );

    await user.keyboard(`{${TIMEZONE_MISMATCH_SWITCH_SHORTCUT_KEY}}`);
    expect(switched).toBe(true);
  });
});
