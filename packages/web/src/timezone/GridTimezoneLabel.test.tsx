import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import {
  getEffectiveTimeZone,
  setEffectiveTimeZoneForTests,
} from "@web/timezone/effective-timezone.store";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import { GridTimezoneLabel } from "@web/timezone/GridTimezoneLabel";
import { describe, expect, it, spyOn } from "bun:test";

describe("GridTimezoneLabel", () => {
  it("is a focusable button named with the effective zone abbreviation", async () => {
    const user = userEvent.setup();
    act(() => {
      setEffectiveTimeZoneForTests("America/Denver");
    });

    render(
      <div>
        <button type="button">Before</button>
        <GridTimezoneLabel />
      </div>,
    );

    const abbreviation = formatTimeZoneAbbreviation("America/Denver");
    const label = screen.getByRole("button", {
      name: `Calendar timezone: ${abbreviation}`,
    });
    expect(label).toHaveTextContent(abbreviation);

    await user.tab();
    expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
    await user.tab();
    expect(label).toHaveFocus();
  });

  it("updates the label when the effective timezone changes", () => {
    act(() => {
      setEffectiveTimeZoneForTests("UTC");
    });

    render(<GridTimezoneLabel />);
    expect(
      screen.getByRole("button", { name: "Calendar timezone: UTC" }),
    ).toBeInTheDocument();

    act(() => {
      setEffectiveTimeZoneForTests("Asia/Kolkata");
    });

    expect(
      screen.getByRole("button", { name: "Calendar timezone: GMT+5:30" }),
    ).toHaveTextContent("GMT+5:30");
  });

  it("rereads the browser timezone on the minute tick", () => {
    let intervalCallback: (() => void) | undefined;
    const setIntervalSpy = spyOn(globalThis, "setInterval").mockImplementation(
      ((callback: TimerHandler) => {
        if (typeof callback === "function") {
          intervalCallback = () => callback();
        }
        return 1 as unknown as ReturnType<typeof setInterval>;
      }) as unknown as typeof setInterval,
    );
    const clearIntervalSpy = spyOn(
      globalThis,
      "clearInterval",
    ).mockImplementation(() => {});

    try {
      const browserZone = getBrowserTimeZone();
      expect(browserZone).not.toBe("Pacific/Kiritimati");

      act(() => {
        setEffectiveTimeZoneForTests("Pacific/Kiritimati");
      });

      render(<GridTimezoneLabel />);
      expect(
        screen.getByRole("button", {
          name: `Calendar timezone: ${formatTimeZoneAbbreviation("Pacific/Kiritimati")}`,
        }),
      ).toBeInTheDocument();

      act(() => {
        intervalCallback?.();
      });

      expect(getEffectiveTimeZone()).toBe(browserZone);
      const browserAbbreviation = formatTimeZoneAbbreviation(browserZone);
      expect(
        screen.getByRole("button", {
          name: `Calendar timezone: ${browserAbbreviation}`,
        }),
      ).toHaveTextContent(browserAbbreviation);
    } finally {
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    }
  });
});
